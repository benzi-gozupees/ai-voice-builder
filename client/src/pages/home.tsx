import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowRightIcon, 
  CheckIcon, 
  PhoneIcon, 
  CalendarIcon, 
  BrainIcon,
  MessageSquareIcon,
  StarIcon,
  ZapIcon,
  UsersIcon
} from "lucide-react";
import logoSrc from "@assets/GoZupees_Logo_1750413255078.png";

// CountUp Animation Component
function CountUpNumber({ targetNumber, suffix = '', prefix = '', duration = 2000 }: { 
  targetNumber: number; 
  suffix?: string; 
  prefix?: string; 
  duration?: number; 
}) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById(`count-${targetNumber}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [targetNumber, isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now();
    const startCount = 0;

    const updateCount = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = startCount + (targetNumber - startCount) * easeOutQuart;
      
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(targetNumber);
      }
    };

    requestAnimationFrame(updateCount);
  }, [isVisible, targetNumber, duration]);

  return (
    <span id={`count-${targetNumber}`}>
      {prefix}{Math.round(count * 10) / 10}{suffix}
    </span>
  );
}

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: PhoneIcon,
      title: "Automate Phone Calls",
      description: "Handle inbound calls, answer inquiries, and book meetings 24/7",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: CalendarIcon,
      title: "Smart Scheduling", 
      description: "Intelligent appointment booking with real-time calendar sync",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: BrainIcon,
      title: "Business Intelligence",
      description: "AI learns your business to provide personalized responses",
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  const automationFeatures = [
    {
      icon: MessageSquareIcon,
      title: "Send SMS messages to customers immediately during phone calls",
      description: ""
    },
    {
      icon: PhoneIcon,
      title: "Redirect or transfer calls to a live human agent",
      description: ""
    },
    {
      icon: ZapIcon,
      title: "Collect customer data & automate actions using Zapier and Webhooks",
      description: ""
    },
    {
      icon: MessageSquareIcon,
      title: "Send emails effortlessly during or after a call",
      description: ""
    },
    {
      icon: MessageSquareIcon,
      title: "Send WhatsApp messages to customers during phone calls",
      description: ""
    },
    {
      icon: CalendarIcon,
      title: "Schedule appointments and send calendar invites during the call",
      description: ""
    }
  ];

  const testimonials = [
    {
      name: "Dr. Samuel Lin",
      business: "Chief Strategic Director, GFX Singapore",
      quote: "We've seen incredible growth! I have to say that we've seen incredible growth in our educational business.",
      rating: 5,
      image: "/api/placeholder/64/64"
    },
    {
      name: "Jessica Johnson", 
      business: "Director, Flux Consulting",
      quote: "Enhancing all of our customer interactions! We developed a great partnership with the team.",
      rating: 5,
      image: "/api/placeholder/64/64"
    },
    {
      name: "Alex Ishail",
      business: "Regional Leader, Google Cloud",
      quote: "Innovative AI Voice Agents! We've been implementing their innovative AI voice agents in our business.",
      rating: 5,
      image: "/api/placeholder/64/64"
    }
  ];

  

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src={logoSrc} alt="VoiceBuilder" className="w-8 h-8" />
              <span className="text-xl font-bold text-white">VoiceBuilder</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              
              <a href="https://gozupees.com" className="text-gray-300 hover:text-white transition-colors">
                Solutions
              </a>
              <a href="https://gozupees.com/pricing" className="text-gray-300 hover:text-white transition-colors">
                Pricing
              </a>
              <a href="https://gozupees.com/integrations" className="text-gray-300 hover:text-white transition-colors">
                Integrations
              </a>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                  LOGIN
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`transform transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Visual element - soundwave */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="flex items-center space-x-1 ml-[-10px] mr-[-10px]">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-blue-500 to-purple-600 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 40 + 10}px`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    ></div>
                  ))}
                </div>
                <div className="absolute -top-2 -right-2 text-xs text-purple-400 mt-[-21px] mb-[-21px]">
                  No-code AI Voice Engine
                </div>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="block">Automate Phone Calls</span>
              <span className="block text-4xl md:text-6xl text-gray-300">With Human-Like AI Reps</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              Create <span className="text-blue-400">Human-like</span> AI voice agents to handle outbound and
              inbound calls, book meetings, and take actions 24/7.
            </p>

            <div className="flex flex-col items-center mb-12">
              <div className="flex items-center space-x-8 text-sm text-gray-400 mb-6">
                <div className="flex items-center">
                  <span className="text-blue-400 mr-2">5X</span>
                  <span>PRODUCTIVITY</span>
                </div>
                <div className="flex items-center">
                  <span className="text-purple-400 mr-2">100X</span>
                  <span>SCALABILITY</span>
                </div>
              </div>

              <Link href="/quick-setup">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold mb-4">
                  GET STARTED
                </Button>
              </Link>

              <div className="flex items-center text-sm text-gray-400">
                <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
                <span>14-day Free Trial</span>
                <CheckIcon className="w-4 h-4 text-green-400 ml-6 mr-2" />
                <span>Free 100 Minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Real Results, No Extra Headcount
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-16 border-t border-b border-gray-800">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                <CountUpNumber targetNumber={12} suffix="M+" />
              </div>
              <div className="text-gray-400 text-sm font-medium mb-2">Customer Interactions Handled</div>
              <div className="text-gray-500 text-xs">Automated tasks completed across all client businesses</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                <CountUpNumber targetNumber={4} suffix="x" />
              </div>
              <div className="text-gray-400 text-sm font-medium mb-2">Faster Lead Replies</div>
              <div className="text-gray-500 text-xs">Response time improvement with AI automation</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                <CountUpNumber targetNumber={40} suffix="%" />
              </div>
              <div className="text-gray-400 text-sm font-medium mb-2">More Conversions</div>
              <div className="text-gray-500 text-xs">Average conversion rate increase for our clients</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                <CountUpNumber targetNumber={99.99} suffix="%" />
              </div>
              <div className="text-gray-400 text-sm font-medium mb-2">Uptime, 24/7</div>
              <div className="text-gray-500 text-xs">Reliable AI operations with enterprise-grade reliability</div>
            </div>
          </div>
        </div>
        
      </section>
      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Build AI Voice Assistants that work for you 24/7
            </h2>
            <div className="flex flex-wrap justify-center gap-8 mt-8">
              <div className="flex items-center text-green-400">
                <CheckIcon className="w-5 h-5 mr-2" />
                Book Meetings
              </div>
              <div className="flex items-center text-green-400">
                <CheckIcon className="w-5 h-5 mr-2" />
                Conduct Interviews
              </div>
              <div className="flex items-center text-green-400">
                <CheckIcon className="w-5 h-5 mr-2" />
                Cold Call Prospects
              </div>
              <div className="flex items-center text-green-400">
                <CheckIcon className="w-5 h-5 mr-2" />
                Offer Support
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-all duration-300 group">
                <CardContent className="p-8">
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Automation Section */}
      <section className="py-20 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Automate Tasks & Actions
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Configure the AI Agents to automate a variety of tasks and actions, like:
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {automationFeatures.map((feature, index) => (
              <div key={index} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-gray-300">{feature.title}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/quick-setup">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4">
                GET STARTED
              </Button>
            </Link>
            <div className="flex items-center justify-center mt-4 text-sm text-gray-400">
              <CheckIcon className="w-4 h-4 text-green-400 mr-2" />
              <span>14-day Free Trial</span>
              <CheckIcon className="w-4 h-4 text-green-400 ml-6 mr-2" />
              <span>Free 100 Minutes</span>
            </div>
          </div>
        </div>
      </section>
      {/* Testimonials Section */}
      <section id="testimonials" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-orange-400 text-lg mb-4">See what people are saying about VoiceBuilder</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mr-4">
                      <UsersIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-sm text-gray-400">{testimonial.business}</div>
                    </div>
                  </div>
                  
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <StarIcon key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  
                  <p className="text-gray-300 italic">"{testimonial.quote}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses using AI to provide exceptional customer service 24/7
          </p>
          
          <Link href="/quick-setup">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold">
              Start Your Free Trial
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          <div className="mt-8 text-gray-400 text-sm">
            No setup fees • Cancel anytime • 30-day money-back guarantee
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src={logoSrc} alt="VoiceBuilder" className="w-8 h-8" />
                <span className="text-xl font-bold">VoiceBuilder</span>
              </div>
              <p className="text-gray-400">
                AI-powered voice assistants for modern businesses
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://gozupees.com/pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="https://gozupees.com/integrations" className="hover:text-white transition-colors">Integration</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://gozupees.com/about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="https://gozupees.com/contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2025 VoiceBuilder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}