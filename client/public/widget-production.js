(function () {
  // Don't load on configuration pages to prevent conflicts
  if (
    window.location.pathname.includes("/configure-assistant/") ||
    window.BLOCK_PRODUCTION_WIDGET
  ) {
    return;
  }

  var scriptTag = document.currentScript;
  var tenantId = scriptTag.getAttribute("data-tenant-id");
  var assistantId = scriptTag.getAttribute("data-assistant-id");

  console.log("Widget loading with:", {
    tenantId: tenantId,
    assistantId: assistantId,
  });

  if (!tenantId) {
    console.error(
      "WIDGET ERROR: Missing required data-tenant-id attribute on widget script",
    );
    return;
  }

  if (!assistantId) {
    console.warn(
      "WIDGET WARNING: Missing data-assistant-id attribute. Will use tenant's default assistant.",
    );
  }

  // Get widget configuration from secure backend
  var API_BASE =
    scriptTag.getAttribute("data-api-base") ||
    "https://c5847f84-f9a3-408e-8f3b-36ff7a61e589-00-y26iblpgggsl.spock.replit.dev";

  // Add cache busting parameter to ensure fresh config
  var timestamp = new Date().getTime();

  console.log("API_BASE:", API_BASE);

  // Fetch configuration with optional assistant ID
  console.log("Fetching config for assistant:", assistantId || "default");
  var configPromise = fetch(
    API_BASE + "/api/public-widget-config?t=" + timestamp,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      credentials: "omit",
      mode: "cors",
      body: JSON.stringify({ tenantId: tenantId, assistantId: assistantId }),
    },
  ).catch(function (error) {
    console.warn(
      "API fetch failed, using direct assistant configuration:",
      error,
    );
    // Return fallback response structure only if assistantId is provided
    if (assistantId) {
      return {
        ok: true,
        json: function () {
          return Promise.resolve({
            assistantId: assistantId,
            apiKey: "b38c975f-ed60-4944-9846-36fca37e5305",
            config: {
              position: "bottom-left",
              offset: "40px",
              width: "60px",
              height: "60px",
              zIndex: 2147483647,
            },
          });
        },
      };
    }
    throw error;
  });

  configPromise
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "Failed to load widget configuration: " + response.status,
        );
      }
      return response.json();
    })
    .then(function (data) {
      var vapiInstance = null;
      var assistant = data.assistantId;
      var apiKey = data.apiKey;
      var buttonConfig = data.config || {};

      console.log(
        "Loading widget with assistant:",
        assistant,
        "for tenant:",
        tenantId,
      );

      (function (d, t) {
        var g = document.createElement(t),
          s = d.getElementsByTagName(t)[0];
        g.src =
          "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
        g.defer = true;
        g.async = true;
        s.parentNode.insertBefore(g, s);

        g.onload = function () {
          // Add critical CSS to ensure fixed positioning works on all sites
          var style = document.createElement("style");
          style.textContent = `
          [data-vapi="true"] {
            position: fixed !important;
            bottom: 40px !important;
            left: 40px !important;
            z-index: 2147483647 !important;
          }
          .vapi-btn {
            position: fixed !important;
            z-index: 2147483647 !important;
          }
        `;
          document.head.appendChild(style);

          // Add delayed CSS override to ensure it loads after VAPI's CSS
          setTimeout(function () {
            var overrideStyle = document.createElement("style");
            overrideStyle.textContent = `
            .vapi-btn.vapi-btn {
              position: fixed !important;
              z-index: 2147483647 !important;
            }
            html body .vapi-btn {
              position: fixed !important;
              z-index: 2147483647 !important;
            }
          `;
            document.head.appendChild(overrideStyle);
          }, 500);

          // Check if the host website has proper permissions policy
          var hasPermissionsPolicy = false;
          var metaTags = document.querySelectorAll(
            'meta[http-equiv="Permissions-Policy"]',
          );
          for (var i = 0; i < metaTags.length; i++) {
            if (metaTags[i].getAttribute("content").includes("microphone")) {
              hasPermissionsPolicy = true;
              break;
            }
          }

          // If no permissions policy found, inject one
          if (!hasPermissionsPolicy) {
            console.log(
              "Adding Permissions-Policy meta tag for microphone access",
            );
            var permissionsMeta = document.createElement("meta");
            permissionsMeta.setAttribute("http-equiv", "Permissions-Policy");
            permissionsMeta.setAttribute(
              "content",
              "microphone=*, camera=*, autoplay=*",
            );
            document.head.appendChild(permissionsMeta);
          }

          // Add iframe allow attribute for microphone access if any iframes exist
          var iframes = document.querySelectorAll("iframe");
          iframes.forEach(function (iframe) {
            if (!iframe.getAttribute("allow")) {
              iframe.setAttribute(
                "allow",
                "microphone; camera; autoplay; encrypted-media",
              );
            }
          });

          // Initialize VAPI with proper microphone handling for embedded environments
          try {
            // First, request microphone permission explicitly
            function requestMicrophonePermission() {
              return navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then(function (stream) {
                  console.log("Microphone permission granted");
                  // Stop the stream immediately as we just needed permission
                  stream.getTracks().forEach(function (track) {
                    track.stop();
                  });
                  return true;
                })
                .catch(function (error) {
                  console.error("Microphone permission denied:", error);
                  return false;
                });
            }

            vapiInstance = window.vapiSDK.run({
              apiKey: apiKey,
              assistant: assistant,
              config: {
                assistantName: buttonConfig.assistantName,
                position: "bottom-left",
                offset: "40px",
                width: "60px",
                height: "60px",
                zIndex: 2147483647,
                // Ensure microphone permission is explicitly requested
                requestMicrophone: true,
                audioConstraints: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
              },
            });

            // Enhanced error handling for microphone permissions
            if (vapiInstance && vapiInstance.on) {
              vapiInstance.on("error", function (error) {
                console.error("VAPI Error:", error);
                if (
                  error.type === "microphone-permission-denied" ||
                  error.message?.includes("microphone") ||
                  error.message?.includes("Permission denied")
                ) {
                  // Show user-friendly message about microphone permissions
                  var notification = document.createElement("div");
                  notification.innerHTML = `
                    <div style="
                      position: fixed;
                      top: 20px;
                      right: 20px;
                      background: #f44336;
                      color: white;
                      padding: 12px 16px;
                      border-radius: 8px;
                      z-index: 2147483648;
                      font-family: Arial, sans-serif;
                      font-size: 14px;
                      max-width: 300px;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    ">
                      <strong>Microphone Access Required</strong><br>
                      Please allow microphone access to use the voice assistant.
                      <button onclick="this.parentElement.parentElement.remove()" style="
                        background: none;
                        border: none;
                        color: white;
                        float: right;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: -2px;
                      ">×</button>
                    </div>
                  `;
                  document.body.appendChild(notification);

                  // Auto-remove notification after 8 seconds
                  setTimeout(function () {
                    if (notification && notification.parentElement) {
                      notification.parentElement.removeChild(notification);
                    }
                  }, 8000);
                }
              });

              vapiInstance.on("call-start", function () {
                console.log("VAPI call started successfully");
              });

              vapiInstance.on("speech-start", function () {
                console.log("User started speaking");
              });

              vapiInstance.on("speech-end", function () {
                console.log("User stopped speaking");
              });
            }

            // Global error monitoring for permission issues
            window.addEventListener("error", function (event) {
              if (
                event.message &&
                (event.message.includes("microphone") ||
                  event.message.includes("Permission denied") ||
                  event.message.includes("NotAllowedError"))
              ) {
                console.warn(
                  "WIDGET WARNING: Microphone access denied. Please allow microphone permissions to use voice features.",
                );
              }
            });

            // Check for permissions API support and provide guidance
            if (navigator.permissions && navigator.permissions.query) {
              navigator.permissions
                .query({ name: "microphone" })
                .then(function (result) {
                  console.log("Microphone permission status:", result.state);
                  if (result.state === "denied") {
                    console.warn(
                      "Microphone permission is denied. Voice features may not work.",
                    );

                    // Show helpful guidance for denied permissions
                    var deniedNotification = document.createElement("div");
                    deniedNotification.innerHTML = `
                    <div style="
                      position: fixed;
                      top: 20px;
                      right: 20px;
                      background: #ff9800;
                      color: white;
                      padding: 12px 16px;
                      border-radius: 8px;
                      z-index: 2147483648;
                      font-family: Arial, sans-serif;
                      font-size: 14px;
                      max-width: 320px;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    ">
                      <strong>Microphone Access Blocked</strong><br>
                      To use voice features, click the microphone icon in your browser's address bar and allow access.
                      <button onclick="this.parentElement.parentElement.remove()" style="
                        background: none;
                        border: none;
                        color: white;
                        float: right;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: -2px;
                      ">×</button>
                    </div>
                  `;

                    // Show notification only when user tries to interact with widget
                    if (vapiInstance && vapiInstance.on) {
                      vapiInstance.on("call-start", function () {
                        document.body.appendChild(deniedNotification);
                        setTimeout(function () {
                          if (
                            deniedNotification &&
                            deniedNotification.parentElement
                          ) {
                            deniedNotification.parentElement.removeChild(
                              deniedNotification,
                            );
                          }
                        }, 10000);
                      });
                    }
                  }
                })
                .catch(function (error) {
                  console.log("Could not check microphone permissions:", error);
                });
            }

            // Add enhanced click handler with microphone permission request
            setTimeout(function () {
              var widget = document.querySelector('[data-vapi="true"]');
              if (widget) {
                var originalClick = widget.onclick;

                // Override the click handler to request microphone permission first
                widget.onclick = function (event) {
                  console.log("Widget clicked, checking permissions...");

                  // Check if we're on HTTPS
                  if (
                    location.protocol !== "https:" &&
                    location.hostname !== "localhost"
                  ) {
                    var httpsWarning = document.createElement("div");
                    httpsWarning.innerHTML = `
                      <div style="
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #f44336;
                        color: white;
                        padding: 12px 16px;
                        border-radius: 8px;
                        z-index: 2147483648;
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        max-width: 300px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                      ">
                        <strong>HTTPS Required</strong><br>
                        Voice features require a secure connection (HTTPS). Please upgrade your website to HTTPS.
                        <button onclick="this.parentElement.parentElement.remove()" style="
                          background: none;
                          border: none;
                          color: white;
                          float: right;
                          cursor: pointer;
                          font-size: 16px;
                          margin-top: -2px;
                        ">×</button>
                      </div>
                    `;
                    document.body.appendChild(httpsWarning);

                    setTimeout(function () {
                      if (httpsWarning && httpsWarning.parentElement) {
                        httpsWarning.parentElement.removeChild(httpsWarning);
                      }
                    }, 8000);
                    return;
                  }

                  // Request microphone permission before proceeding
                  requestMicrophonePermission()
                    .then(function (hasPermission) {
                      if (hasPermission) {
                        console.log(
                          "Microphone permission granted, proceeding with call...",
                        );
                        // Proceed with original click handler
                        if (originalClick) {
                          originalClick.call(widget, event);
                        } else if (vapiInstance && vapiInstance.start) {
                          // Fallback: manually start VAPI call
                          vapiInstance.start();
                        }
                      } else {
                        console.warn(
                          "Microphone permission denied, showing instruction",
                        );
                        // Show instruction for enabling microphone
                        var permissionHelp = document.createElement("div");
                        permissionHelp.innerHTML = `
                        <div style="
                          position: fixed;
                          top: 20px;
                          right: 20px;
                          background: #ff9800;
                          color: white;
                          padding: 16px 20px;
                          border-radius: 12px;
                          z-index: 2147483648;
                          font-family: Arial, sans-serif;
                          font-size: 14px;
                          max-width: 350px;
                          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                          line-height: 1.4;
                        ">
                          <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <strong>🎤 Microphone Access Required</strong>
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
                              background: none;
                              border: none;
                              color: white;
                              margin-left: auto;
                              cursor: pointer;
                              font-size: 18px;
                              padding: 0;
                              width: 20px;
                              height: 20px;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                            ">×</button>
                          </div>
                          <div style="font-size: 13px;">
                            To use the voice assistant:<br>
                            1. Click the 🔒 lock icon in your browser's address bar<br>
                            2. Set Microphone to "Allow"<br>
                            3. Refresh the page and try again
                          </div>
                        </div>
                      `;
                        document.body.appendChild(permissionHelp);

                        setTimeout(function () {
                          if (permissionHelp && permissionHelp.parentElement) {
                            permissionHelp.parentElement.removeChild(
                              permissionHelp,
                            );
                          }
                        }, 12000);
                      }
                    })
                    .catch(function (error) {
                      console.error(
                        "Error checking microphone permission:",
                        error,
                      );
                      // Still proceed with original click handler as fallback
                      if (originalClick) {
                        originalClick.call(widget, event);
                      }
                    });
                };
              }
            }, 1000);
          } catch (error) {
            console.error(
              "WIDGET ERROR: Failed to initialize voice assistant:",
              error,
            );

            // Provide more specific guidance for permission errors
            if (
              error.message &&
              (error.message.includes("microphone") ||
                error.message.includes("Permission") ||
                error.message.includes("NotAllowed"))
            ) {
              console.warn(
                "WIDGET WARNING: Microphone permissions are required for voice functionality. " +
                  "Please ensure your website allows microphone access and users grant permission when prompted.",
              );
            }
          }

          // Robust positioning enforcement with DOM mutation observer
          var positionAttempts = 0;
          var maxAttempts = 20;
          var positionObserver = null;

          function enforceFixedPosition() {
            var widgetElement = document.querySelector('[data-vapi="true"]');

            if (widgetElement) {
              // Force fixed positioning with direct style application
              widgetElement.style.setProperty("position", "fixed", "important");
              widgetElement.style.setProperty("bottom", "40px", "important");
              widgetElement.style.setProperty("left", "40px", "important");
              widgetElement.style.setProperty(
                "z-index",
                "2147483647",
                "important",
              );

              console.log("Widget positioned - Assistant:", assistant);
              console.log(
                "Position:",
                window.getComputedStyle(widgetElement).position,
              );
              console.log(
                "Bottom:",
                window.getComputedStyle(widgetElement).bottom,
              );
              console.log("Left:", window.getComputedStyle(widgetElement).left);
            } else {
              positionAttempts++;
              if (positionAttempts < maxAttempts) {
                setTimeout(enforceFixedPosition, 500);
              }
            }
          }

          // Enforce fixed positioning multiple times to override any conflicting CSS
          setTimeout(enforceFixedPosition, 500);
          setTimeout(enforceFixedPosition, 1000);
          setTimeout(enforceFixedPosition, 2000);
          setTimeout(enforceFixedPosition, 3000);

          // Continuous monitoring to maintain fixed position on published sites
          setInterval(function () {
            var widget = document.querySelector('[data-vapi="true"]');
            if (widget) {
              var computed = window.getComputedStyle(widget);
              if (computed.position !== "fixed") {
                enforceFixedPosition();
              }
            }
          }, 5000);

          console.log(
            "Widget loaded successfully - Assistant:",
            assistant,
            "for tenant:",
            tenantId,
          );
        };
      })(document, "script");
    })
    .catch(function (error) {
      console.error(
        "Final fallback - all configuration attempts failed:",
        error,
      );
      console.error("Widget will not load due to configuration errors");
    });
})();
