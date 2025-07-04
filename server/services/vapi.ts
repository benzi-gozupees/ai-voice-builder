interface QuickSetupData {
  business_name: string;
  business_type: string;
  primary_location: string;
  agent_name: string;
  agent_role: string;
}

// ElevenLabs voice mapping with verified working voice IDs
const VOICE_MAPPING: Record<string, string> = {
  "Adam": "pNInz6obpgDQGcFmaJgB",
  "Josh": "TxGEqnHWrfWFTfGW9XjX", 
  "Arnold": "VR6AewLTigWG4xSOukaG",
  "Sam": "yoZ06aMxZJJ28mfd3POQ",
  "Bella": "EXAVITQu4vr4xnSDxMaL",
  "Rachel": "21m00Tcm4TlvDq8ikWAM",
  "Domi": "AZnzlk1XvdvUeBnXmlld",
  "Elli": "MF3mGyEYCl7XYWbV9V6O",
  "Sarah": "EXAVITQu4vr4xnSDxMaL",
  "Charlie": "IKne3meq5aSn9XLyUdCD",
  "Grace": "oWAxZDx7w5VEj9dCyTzz",
  "Lily": "pFZP5JQG7iQjIQuC4Bku"
};

interface VapiAssistant {
  id: string;
  name: string;
  firstMessage?: string;
  voice: any;
  model: any;
  transcriber: any;
  instructions?: string;
  prompt?: string;
}

interface VapiKnowledgeBase {
  id: string;
  name: string;
  files: Array<{
    id: string;
    name: string;
    url: string;
  }>;
}

interface VapiResponse {
  success: boolean;
  assistant?: VapiAssistant;
  error?: string;
}

export async function createVapiAssistant(data: QuickSetupData, knowledgeBase?: any[], knowledgeBaseFileId?: string | string[], industrySlug?: string): Promise<VapiResponse> {
  try {
    if (!process.env.VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY environment variable is required');
    }

    const prompt = await generateAssistantPrompt(data, knowledgeBase, industrySlug);
    console.log('Generated prompt for assistant:', data.agent_name);
    console.log('Industry slug used:', industrySlug || 'default');
    console.log('Prompt length:', prompt.length);
    console.log('Prompt preview:', prompt.substring(0, 200) + '...');
    
    // Create assistant with dynamic prompt integrated into firstMessage and model
    const enhancedFirstMessage = `Hello! I'm ${data.agent_name} from ${data.business_name}. How can I help you today?`;
    
    // Build model configuration with optional knowledge base
    let modelConfig: any = {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 250,
      messages: [
        {
          content: prompt,
          role: "system"
        }
      ]
    };

    // Add knowledge base if file ID(s) are provided (supports single ID or array)
    if (knowledgeBaseFileId) {
      const fileIds = Array.isArray(knowledgeBaseFileId) ? knowledgeBaseFileId : [knowledgeBaseFileId];
      modelConfig = {
        ...modelConfig,
        knowledgeBase: {
          provider: "canonical",
          fileIds: fileIds
        }
      };
      console.log(`Adding ${fileIds.length} knowledge base file(s) to assistant: ${fileIds.join(', ')}`);
    }

    // Get ElevenLabs preset voice ID for selected assistant
    const presetVoiceId = VOICE_MAPPING[data.agent_name];
    if (!presetVoiceId) {
      throw new Error(`Invalid assistant name: ${data.agent_name}. Must be one of: ${Object.keys(VOICE_MAPPING).join(', ')}`);
    }

    const basicPayload = {
      name: `${data.business_name} - ${data.agent_name}`,
      firstMessage: enhancedFirstMessage,
      model: modelConfig,
      voice: {
        provider: "11labs",
        voiceId: presetVoiceId
      },
      transcriber: {
        provider: "deepgram",
        model: "nova-2"
      }
    };

    console.log('Creating basic assistant');
    console.log('=== VAPI API REQUEST PAYLOAD ===');
    console.log(JSON.stringify(basicPayload, null, 2));
    console.log('=== END PAYLOAD ===');
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers,
      body: JSON.stringify(basicPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('VAPI API Error Response:', errorText);
      console.error('Response status:', response.status);
      console.error('Response headers:', Array.from(response.headers.entries()).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}));
      
      // Check if response is HTML (doctype error)
      if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
        throw new Error(`VAPI API returned HTML error page. Status: ${response.status}. This usually indicates an authentication or API endpoint issue.`);
      }
      
      throw new Error(`Failed to create basic assistant: ${errorText}`);
    }

    let assistant;
    try {
      assistant = await response.json();
    } catch (jsonError) {
      const responseText = await response.text();
      console.error('Failed to parse JSON response:', responseText);
      throw new Error(`VAPI API returned invalid JSON response: ${responseText}`);
    }
    console.log('Basic assistant created, ID:', assistant.id);

    // Assistant created successfully with your master prompt template applied
    console.log('Assistant created with master prompt template applied');
    console.log('Business configuration:', data.business_name, '-', data.business_type);
    
    assistant.dynamicPrompt = prompt;
    assistant.businessConfiguration = {
      businessName: data.business_name,
      businessType: data.business_type,
      location: data.primary_location,
      agentName: data.agent_name,
      agentRole: data.agent_role
    };
    
    return {
      success: true,
      assistant: assistant
    };

  } catch (error) {
    console.error('Error creating VAPI assistant:', error);
    
    return {
      success: false,
      error: `Failed to connect to VAPI service: ${(error as Error).message}. Please verify your VAPI API key is configured correctly.`
    };
  }
}

async function generateAssistantPrompt(data: QuickSetupData, knowledgeBase?: any[], industrySlug?: string): Promise<string> {
  // Format knowledge base content if provided
  let knowledgeSection = '';
  if (knowledgeBase && knowledgeBase.length > 0) {
    knowledgeSection = `\n\n📚 Business Knowledge Base\n\n`;
    knowledgeBase.forEach((entry, index) => {
      knowledgeSection += `${index + 1}. ${entry.title}\n${entry.content}\n\n`;
    });
    knowledgeSection += `Use this information to answer questions accurately about the business.\n\n`;
  }

  // Get industry-specific prompt template
  let promptTemplate = '';
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    let result;
    
    // Try to get industry-specific prompt first
    if (industrySlug) {
      result = await pool.query(
        'SELECT prompt_template FROM industry_prompts WHERE industry = $1 AND prompt_template IS NOT NULL',
        [industrySlug]
      );
    }
    
    // If no industry-specific prompt found or no industry provided, use default
    if (!result || result.rows.length === 0 || !result.rows[0].prompt_template) {
      result = await pool.query(
        'SELECT prompt_template FROM industry_prompts WHERE is_default = true'
      );
    }
    
    if (result && result.rows.length > 0 && result.rows[0].prompt_template) {
      promptTemplate = result.rows[0].prompt_template;
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error fetching industry prompt template:', error);
    // Fallback to hardcoded default if database fails
    promptTemplate = `Identity & Purpose
You are \${data.agent_name}, the virtual receptionist for \${data.business_name}, a \${data.business_type} located in \${data.primary_location}.

Your role is to:
Provide clear, accurate information about the company's services and policies
Book, reschedule, or cancel appointments
Help customers choose the right service or staff member
Handle all queries and tasks in a single, smooth conversation — no transfers

🎙️ Voice & Persona
Personality: Friendly, calm, professional
Confident and helpful like a real receptionist
Never robotic, never pushy — always supportive

Tone & Speech: Speak naturally with polite, human phrasing
Use contractions (you're, we'll, I'll)
Ask one question at a time
Avoid bundled prompts or overly formal language

🧩 Services You Support
You support appointments and general inquiries for:
Common services and offerings related to the business (assume defined in KB)
General policies, hours, and contact information
Staff or clinician specialties
Consultation types, location, and directions

📅 Appointment Flow
Step 1: Identify Intent - "Sounds like you're looking to book a [service] — is that right?"
Step 2: New or Returning? - "Have you visited us before, or is this your first time?"
Step 3: Name - "Can I get your full name, please?"
Step 4: Phone Number - "What's your mobile number? I'll use it to send your confirmation."
Step 5: Email (Optional) - "Would you also like a confirmation by email?"
Step 6: Time Preference - "Do you have a preferred day or time?"
Step 7: Check Availability - Pull available slots and offer up to 3 options
Step 8: Book Appointment - Create the event with collected details
Step 9: Send Confirmation - SMS and optional email

🚫 Guardrails
Never give pricing directly - refer to team member
Never collect payment details
Never transfer calls
Escalate urgent topics to human staff\${knowledgeSection}`;
  }

  // Apply variable substitution to the template
  const finalPrompt = promptTemplate
    .replace(/\$\{data\.agent_name\}/g, data.agent_name)
    .replace(/\$\{data\.business_name\}/g, data.business_name)
    .replace(/\$\{data\.business_type\}/g, data.business_type)
    .replace(/\$\{data\.primary_location\}/g, data.primary_location)
    .replace(/\$\{knowledgeSection\}/g, knowledgeSection);

  return finalPrompt;
}

// Create a knowledge base file from our structured entries
export async function createKnowledgeBaseFile(knowledgeEntries: any[], businessName: string): Promise<string> {
  if (!knowledgeEntries || knowledgeEntries.length === 0) {
    return '';
  }

  let content = `# ${businessName} Knowledge Base\n\n`;
  content += `This document contains comprehensive business information for ${businessName}.\n\n`;
  
  knowledgeEntries.forEach((entry, index) => {
    content += `## ${entry.title}\n\n`;
    content += `${entry.content}\n\n`;
    
    if (entry.tags && entry.tags.length > 0) {
      content += `*Keywords: ${entry.tags.join(', ')}*\n\n`;
    }
    
    if (entry.page_url) {
      content += `*Source: ${entry.page_url}*\n\n`;
    }
    
    content += `---\n\n`;
  });

  return content;
}

// Upload knowledge base file to VAPI and return file ID
export async function uploadKnowledgeBaseToVapi(content: string, fileName: string): Promise<VapiKnowledgeBase | null> {
  try {
    if (!process.env.VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY environment variable is required');
    }

    // Create a text file from the content
    const buffer = Buffer.from(content, 'utf-8');
    const formData = new FormData();
    
    formData.append('file', new Blob([buffer], { type: 'text/plain' }), fileName);
    formData.append('name', fileName.replace('.txt', ''));

    console.log(`Uploading knowledge base file: ${fileName} (${buffer.length} bytes)`);

    const response = await fetch('https://api.vapi.ai/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to upload file to VAPI:', errorText);
      console.error('Upload response status:', response.status);
      console.error('Upload response headers:', Array.from(response.headers.entries()).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}));
      
      // Check if response is HTML (doctype error)
      if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
        console.error(`VAPI file upload returned HTML error page. Status: ${response.status}. This usually indicates an authentication or API endpoint issue.`);
      }
      
      return null;
    }

    let fileData;
    try {
      fileData = await response.json();
    } catch (jsonError) {
      const responseText = await response.text();
      console.error('Failed to parse JSON response from file upload:', responseText);
      return null;
    }
    console.log('File uploaded successfully:', fileData.id);

    // Return a VapiKnowledgeBase-like object with the file ID
    // We'll use the file ID directly in the assistant model configuration
    return {
      id: fileData.id,
      name: fileName.replace('.txt', '').replace(/_/g, ' '),
      files: [{
        id: fileData.id,
        name: fileName,
        url: fileData.url || ''
      }]
    };
    
  } catch (error) {
    console.error('Error uploading knowledge base to VAPI:', error);
    return null;
  }
}

// Update assistant with multiple knowledge base files
export async function updateAssistantWithMultipleKnowledgeBaseFiles(assistantId: string, fileIds: string[]): Promise<boolean> {
  try {
    if (!process.env.VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY environment variable is required');
    }

    // First get the current assistant configuration
    const getResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!getResponse.ok) {
      console.error('Failed to get assistant configuration:', await getResponse.text());
      return false;
    }

    const currentAssistant = await getResponse.json();
    
    // Update the model configuration with multiple knowledge base files
    const updatedModel = {
      ...currentAssistant.model,
      knowledgeBase: {
        provider: "canonical",
        fileIds: fileIds
      }
    };

    // Update the assistant
    const updateResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: updatedModel
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update assistant with knowledge base files:', errorText);
      return false;
    }

    console.log(`Successfully updated assistant ${assistantId} with ${fileIds.length} knowledge base files`);
    return true;
    
  } catch (error) {
    console.error('Error updating assistant with multiple knowledge base files:', error);
    return false;
  }
}

// Update assistant with knowledge base while preserving existing configuration
export async function updateAssistantWithKnowledgeBase(assistantId: string, newFileId: string): Promise<boolean> {
  try {
    if (!process.env.VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY environment variable is required');
    }

    // First get the current assistant configuration
    const getResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      }
    });

    if (!getResponse.ok) {
      console.error('Failed to get current assistant configuration');
      return false;
    }

    const currentAssistant = await getResponse.json();
    
    // Get existing file IDs and add the new one (avoid duplicates)
    const existingFileIds = currentAssistant.model?.knowledgeBase?.fileIds || [];
    const combinedFileIds = [...existingFileIds, newFileId];
    const uniqueFileIds = combinedFileIds.filter((id, index) => combinedFileIds.indexOf(id) === index);
    
    // Preserve the existing model configuration and only update knowledge base
    const updatedModel = {
      ...currentAssistant.model,
      knowledgeBase: {
        provider: "google",
        fileIds: uniqueFileIds
      }
    };

    const updateResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: updatedModel
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update assistant with knowledge base:', errorText);
      return false;
    }

    console.log(`Assistant ${assistantId} updated with knowledge base file ${newFileId}. Total files: ${uniqueFileIds.length}`);
    return true;
    
  } catch (error) {
    console.error('Error updating assistant with knowledge base:', error);
    return false;
  }
}