import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes, syncAppointmentsForAllTenants } from "./routes";
import { analyticsService } from "./services/analytics";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// CORS configuration for widget embedding with microphone permissions
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires');
  res.header('Access-Control-Max-Age', '86400');
  
  // Permissions Policy to allow microphone access for embedded widgets
  res.header('Permissions-Policy', 'microphone=*, camera=*, autoplay=*, encrypted-media=*, display-capture=*');
  
  // Feature Policy for older browsers
  res.header('Feature-Policy', 'microphone *; camera *; autoplay *; encrypted-media *; display-capture *');
  
  // Allow iframe embedding with microphone permissions
  res.header('X-Frame-Options', 'ALLOWALL');
  res.header('Content-Security-Policy', "frame-ancestors *; microphone 'self' *;");
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Serve widget-production.js with strong cache-busting headers and permissions
  app.get('/widget-production.js', (req, res) => {
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    res.header('Last-Modified', new Date().toUTCString());
    res.header('ETag', Date.now().toString());
    res.header('Access-Control-Allow-Origin', '*');
    
    // Permissions Policy for widget to allow microphone access
    res.header('Permissions-Policy', 'microphone=*, camera=*, autoplay=*, encrypted-media=*, display-capture=*');
    res.header('Feature-Policy', 'microphone *; camera *; autoplay *; encrypted-media *; display-capture *');
    
    try {
      const widgetPath = path.resolve(process.cwd(), 'client/public/widget-production.js');
      res.sendFile(widgetPath);
    } catch (error) {
      console.error('Error serving widget-production.js:', error);
      res.status(500).json({ error: 'Failed to serve widget file' });
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start background appointment sync every 30 minutes
    console.log('Starting background appointment sync scheduler...');
    
    // Run initial sync after 2 minutes to allow server to fully start
    setTimeout(() => {
      syncAppointmentsForAllTenants().catch(error => {
        console.error('Initial appointment sync failed:', error);
      });
    }, 2 * 60 * 1000);
    
    // Then run every 30 minutes
    setInterval(() => {
      syncAppointmentsForAllTenants().catch(error => {
        console.error('Scheduled appointment sync failed:', error);
      });
    }, 30 * 60 * 1000);

    // Start analytics background processing
    console.log('Starting analytics processing scheduler...');
    
    // Sentiment analysis every 15 minutes
    setInterval(() => {
      analyticsService.processSentimentAnalysis().catch(error => {
        console.error('Sentiment analysis processing failed:', error);
      });
    }, 15 * 60 * 1000);
    
    // Daily summaries at midnight and every hour
    const now = new Date();
    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
    const timeToNextHour = nextHour.getTime() - now.getTime();
    
    setTimeout(() => {
      // Run daily processing
      analyticsService.processDailySummaries().catch(error => {
        console.error('Daily analytics processing failed:', error);
      });
      analyticsService.processAssistantPerformance().catch(error => {
        console.error('Assistant performance processing failed:', error);
      });
      
      // Then every hour
      setInterval(() => {
        analyticsService.processDailySummaries().catch(error => {
          console.error('Daily analytics processing failed:', error);
        });
        analyticsService.processAssistantPerformance().catch(error => {
          console.error('Assistant performance processing failed:', error);
        });
      }, 60 * 60 * 1000);
    }, timeToNextHour);
  });
})();
