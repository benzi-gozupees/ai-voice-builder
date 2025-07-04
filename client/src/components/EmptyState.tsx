import {Bot,Plus} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
export function EmptyState() {
    const [location, setLocation] = useLocation();
    return (
        <div className="text-center py-24">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-3xl mx-auto flex items-center justify-center">
            <Bot className="w-12 h-12 text-blue-600" />
          </div>
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-3xl blur opacity-20 animate-pulse"></div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          Create Your First Voice Assistant
        </h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
          Transform your business with an AI voice assistant that handles calls, books appointments, and serves customers 24/7.
        </p>
        <Button 
          onClick={() => setLocation("/quick-setup")}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl px-8 py-4 text-lg font-semibold"
        >
          <Plus className="w-5 h-5 mr-3" />
          Get Started with Quick Setup
        </Button>
      </div>
    )
}