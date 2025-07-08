import { Pool } from 'pg';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Daily analytics aggregation service
export class AnalyticsService {
  private dbPool: Pool;

  constructor() {
    this.dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  // Process daily analytics for all tenants
  async processDailySummaries(): Promise<void> {
    console.log('Starting daily analytics processing...');
    
    try {
      // Get tenants with calls TODAY only (efficient - no historical reprocessing)
      const tenantsResult = await this.dbPool.query(`
        SELECT DISTINCT tenant_id 
        FROM call_logs 
        WHERE DATE(started_at) = CURRENT_DATE
      `);

      const today = new Date().toISOString().split('T')[0];
      for (const tenant of tenantsResult.rows) {
        await this.processTenantDailySummaryForDate(tenant.tenant_id, today);
      }

      console.log(`Processed ${tenantsResult.rows.length} tenants with new calls today`);
    } catch (error) {
      console.error('Error processing daily analytics:', error);
    }
  }

  // One-time historical data processing (manual trigger only)
  async processAllHistoricalData(): Promise<void> {
    console.log('Processing ALL historical data (one-time operation)...');
    try {
      const tenantsResult = await this.dbPool.query(`
        SELECT DISTINCT tenant_id FROM call_logs 
        WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      for (const tenant of tenantsResult.rows) {
        const datesResult = await this.dbPool.query(`
          SELECT DISTINCT DATE(started_at) as call_date
          FROM call_logs WHERE tenant_id = $1 
          ORDER BY call_date DESC
        `, [tenant.tenant_id]);

        for (const dateRow of datesResult.rows) {
          await this.processTenantDailySummaryForDate(tenant.tenant_id, dateRow.call_date);
        }
      }
      console.log('Historical data processing completed');
    } catch (error) {
      console.error('Error processing historical data:', error);
    }
  }

  // Process daily summary for a specific tenant and date
  async processTenantDailySummaryForDate(tenantId: string, date: string): Promise<void> {

    try {
      // Get call statistics for today from existing call_logs table
      const callStats = await this.dbPool.query(`
        SELECT 
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE result = 'pass') as successful_calls,
          AVG(duration) as avg_duration,
          SUM(duration) as total_duration
        FROM call_logs 
        WHERE tenant_id = $1 AND DATE(started_at) = $2
      `, [tenantId, date]);

      // Get call outcomes separately to avoid nested aggregation
      const outcomeStats = await this.dbPool.query(`
        SELECT ended_reason, COUNT(*) as count
        FROM call_logs 
        WHERE tenant_id = $1 AND DATE(started_at) = $2
        GROUP BY ended_reason
      `, [tenantId, date]);

      // Get appointment statistics - count appointments by when they were synced (closest to booking date)
      // This counts appointments based on the synced_at timestamp which represents when they were created
      const appointmentStats = await this.dbPool.query(`
        SELECT COUNT(*) as total_appointments
        FROM appointments 
        WHERE tenant_id = $1 AND DATE(synced_at) = $2
      `, [tenantId, date]);

      // Get sentiment statistics for today
      const sentimentStats = await this.dbPool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE sentiment_label = 'positive') as positive,
          COUNT(*) FILTER (WHERE sentiment_label = 'neutral') as neutral,
          COUNT(*) FILTER (WHERE sentiment_label = 'negative') as negative,
          AVG(sentiment_score) as avg_sentiment
        FROM call_sentiment_analysis csa
        JOIN call_logs cl ON csa.call_id = cl.id
        WHERE csa.tenant_id = $1 AND DATE(cl.started_at) = $2
      `, [tenantId, date]);

      const callData = callStats.rows[0];
      const appointmentData = appointmentStats.rows[0];
      const sentimentData = sentimentStats.rows[0];

      // Build call outcomes object from separate query
      const callOutcomes: Record<string, number> = {};
      outcomeStats.rows.forEach((row: any) => {
        callOutcomes[row.ended_reason || 'unknown'] = parseInt(row.count);
      });

      // Insert or update daily summary
      await this.dbPool.query(`
        INSERT INTO analytics_daily_summary (
          tenant_id, date, total_calls, successful_calls, total_appointments,
          avg_call_duration, total_call_time, sentiment_positive, sentiment_neutral,
          sentiment_negative, avg_sentiment_score, call_outcomes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (tenant_id, date) 
        DO UPDATE SET
          total_calls = EXCLUDED.total_calls,
          successful_calls = EXCLUDED.successful_calls,
          total_appointments = EXCLUDED.total_appointments,
          avg_call_duration = EXCLUDED.avg_call_duration,
          total_call_time = EXCLUDED.total_call_time,
          sentiment_positive = EXCLUDED.sentiment_positive,
          sentiment_neutral = EXCLUDED.sentiment_neutral,
          sentiment_negative = EXCLUDED.sentiment_negative,
          avg_sentiment_score = EXCLUDED.avg_sentiment_score,
          call_outcomes = EXCLUDED.call_outcomes,
          updated_at = NOW()
      `, [
        tenantId,
        date,
        parseInt(callData.total_calls) || 0,
        parseInt(callData.successful_calls) || 0,
        parseInt(appointmentData.total_appointments) || 0,
        Math.round(parseFloat(callData.avg_duration)) || 0,
        Math.round(parseFloat(callData.total_duration) / 60) || 0, // Convert to minutes
        parseInt(sentimentData.positive) || 0,
        parseInt(sentimentData.neutral) || 0,
        parseInt(sentimentData.negative) || 0,
        Math.round(parseFloat(sentimentData.avg_sentiment)) || 0,
        JSON.stringify(callOutcomes)
      ]);

      console.log(`Processed daily summary for tenant: ${tenantId} on ${date}`);
    } catch (error) {
      console.error(`Error processing daily summary for tenant ${tenantId}:`, error);
    }
  }

  // Process sentiment analysis for existing call logs
  async processSentimentAnalysis(): Promise<void> {
    console.log('Starting sentiment analysis processing from existing call_logs...');

    try {
      // Get call logs from existing table without sentiment analysis
      const unanalyzedCalls = await this.dbPool.query(`
        SELECT cl.id, cl.tenant_id, cl.transcript
        FROM call_logs cl
        LEFT JOIN call_sentiment_analysis csa ON cl.id = csa.call_id
        WHERE csa.call_id IS NULL 
        AND cl.transcript IS NOT NULL 
        AND cl.transcript::text != 'null'
        AND LENGTH(cl.transcript::text) > 10
        LIMIT 50
      `);

      for (const call of unanalyzedCalls.rows) {
        await this.analyzeSentiment(call.id, call.tenant_id, call.transcript);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Processed sentiment analysis for ${unanalyzedCalls.rows.length} existing calls`);
    } catch (error) {
      console.error('Error processing sentiment analysis:', error);
    }
  }

  // Analyze sentiment for a single call
  async analyzeSentiment(callId: string, tenantId: string, transcript: any): Promise<void> {
    try {
      if (!transcript || !openai.apiKey) {
        return;
      }

      // Extract text from transcript
      let transcriptText = '';
      if (typeof transcript === 'string') {
        transcriptText = transcript;
      } else if (transcript && Array.isArray(transcript)) {
        transcriptText = transcript.map(t => t.text || t.content || '').join(' ');
      } else if (transcript && typeof transcript === 'object') {
        transcriptText = transcript.text || transcript.content || JSON.stringify(transcript);
      }

      if (!transcriptText || transcriptText.length < 10) {
        return;
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze the sentiment of this call transcript and extract key topics. Respond with valid JSON in this exact format:
{
  "sentiment_score": <number 0-100>,
  "sentiment_label": "<positive|neutral|negative>",
  "key_topics": ["topic1", "topic2", "topic3"]
}

Sentiment scoring:
- 70-100: positive (customer satisfied, issue resolved, positive interaction)
- 40-69: neutral (informational, mixed sentiment, routine interaction)
- 0-39: negative (customer frustrated, issue unresolved, poor experience)`
          },
          {
            role: 'user',
            content: `Analyze this call transcript: ${transcriptText.substring(0, 2000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const analysisText = response.choices[0]?.message?.content?.trim();
      if (!analysisText) return;

      let analysis;
      try {
        analysis = JSON.parse(analysisText);
      } catch (parseError) {
        console.error('Failed to parse sentiment analysis response:', parseError);
        return;
      }

      // Validate and insert sentiment analysis
      const sentimentScore = Math.max(0, Math.min(100, analysis.sentiment_score || 50));
      let sentimentLabel = analysis.sentiment_label || 'neutral';
      if (!['positive', 'neutral', 'negative'].includes(sentimentLabel)) {
        sentimentLabel = sentimentScore >= 70 ? 'positive' : sentimentScore >= 40 ? 'neutral' : 'negative';
      }

      await this.dbPool.query(`
        INSERT INTO call_sentiment_analysis (
          call_id, tenant_id, sentiment_score, sentiment_label, key_topics
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (call_id) DO NOTHING
      `, [
        callId,
        tenantId,
        sentimentScore,
        sentimentLabel,
        JSON.stringify(analysis.key_topics || [])
      ]);

    } catch (error) {
      console.error(`Error analyzing sentiment for call ${callId}:`, error);
    }
  }

  // Process assistant performance metrics
  async processAssistantPerformance(): Promise<void> {
    console.log('Starting assistant performance processing...');

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get all assistants with activity today
      const assistantsResult = await this.dbPool.query(`
        SELECT DISTINCT 
          cl.assistant_id, 
          cl.assistant_name,
          cl.tenant_id
        FROM call_logs cl
        WHERE DATE(cl.started_at) = $1
      `, [today]);

      for (const assistant of assistantsResult.rows) {
        await this.processAssistantDailyPerformance(
          assistant.assistant_id,
          assistant.assistant_name,
          assistant.tenant_id,
          today
        );
      }

      console.log('Assistant performance processing completed');
    } catch (error) {
      console.error('Error processing assistant performance:', error);
    }
  }

  // Process daily performance for a specific assistant
  async processAssistantDailyPerformance(
    assistantId: string, 
    assistantName: string,
    tenantId: string, 
    date: string
  ): Promise<void> {
    try {
      // Get call metrics for this assistant today
      const callMetrics = await this.dbPool.query(`
        SELECT 
          COUNT(*) as call_count,
          COUNT(*) FILTER (WHERE result = 'pass') as successful_calls,
          AVG(duration) as avg_duration
        FROM call_logs 
        WHERE assistant_id = $1 AND DATE(started_at) = $2
      `, [assistantId, date]);

      // Get appointment metrics for this assistant today
      const appointmentMetrics = await this.dbPool.query(`
        SELECT COUNT(*) as appointment_count
        FROM appointments 
        WHERE assistant_id = $1 AND DATE(start_time) = $2
      `, [assistantId, date]);

      // Get sentiment metrics for this assistant today
      const sentimentMetrics = await this.dbPool.query(`
        SELECT AVG(sentiment_score) as avg_sentiment
        FROM call_sentiment_analysis csa
        JOIN call_logs cl ON csa.call_id = cl.id
        WHERE cl.assistant_id = $1 AND DATE(cl.started_at) = $2
      `, [assistantId, date]);

      const callData = callMetrics.rows[0];
      const appointmentData = appointmentMetrics.rows[0];
      const sentimentData = sentimentMetrics.rows[0];

      const successRate = callData.call_count > 0 
        ? Math.round((callData.successful_calls / callData.call_count) * 100)
        : 0;

      // Insert or update assistant performance
      await this.dbPool.query(`
        INSERT INTO assistant_performance_daily (
          assistant_id, assistant_name, tenant_id, date, call_count,
          appointment_count, avg_duration, sentiment_avg, success_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (assistant_id, date) 
        DO UPDATE SET
          call_count = EXCLUDED.call_count,
          appointment_count = EXCLUDED.appointment_count,
          avg_duration = EXCLUDED.avg_duration,
          sentiment_avg = EXCLUDED.sentiment_avg,
          success_rate = EXCLUDED.success_rate,
          updated_at = NOW()
      `, [
        assistantId,
        assistantName,
        tenantId,
        date,
        parseInt(callData.call_count) || 0,
        parseInt(appointmentData.appointment_count) || 0,
        Math.round(parseFloat(callData.avg_duration)) || 0,
        Math.round(parseFloat(sentimentData.avg_sentiment)) || 0,
        successRate
      ]);

    } catch (error) {
      console.error(`Error processing assistant performance for ${assistantId}:`, error);
    }
  }

  async close(): Promise<void> {
    await this.dbPool.end();
  }
}

export const analyticsService = new AnalyticsService();