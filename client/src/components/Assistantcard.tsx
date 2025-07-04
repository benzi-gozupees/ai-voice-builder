import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Bot, Calendar, BookOpen, Code, Settings, LogOut, Plus, TestTube, Edit, Copy, AlertTriangle, CheckCircle, Clock, Building, User, Sparkles, Zap, Phone, Play, Activity, EyeIcon, EyeOffIcon, Save } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
interface Assistant {
  id: string;
  tenant_id: string;
  vapi_assistant_id: string;
  name: string;
  voice: string;
  is_active: boolean;
  business_name: string;
  industry: string;
  location: string;
  created_at: string;
  kb_configured?: boolean;
  prompt_updated?: boolean;
}
const getStatusBadge = (assistant: Assistant) => {
  if (!assistant.kb_configured) {
    return (
      <Badge className="bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200 px-3 py-1 rounded-full font-semibold">
        Knowledge Base Required
      </Badge>
    );
  }
  return (
    <Badge className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border-emerald-200 px-3 py-1 rounded-full font-semibold">
      ✓ Ready
    </Badge>
  );
};
const getStatusWarnings = (assistant: Assistant) => {
  const warnings = [];
  if (!assistant.kb_configured) warnings.push("Knowledgebase not configured");
  if (!assistant.prompt_updated) warnings.push("Default prompt in use");
  return warnings;
};
export function AssistantCard({ assistant }: { assistant: Assistant }) {
  return (
    <Card
      key={assistant.id}
      className="bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border-0 rounded-2xl overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <CardHeader className="pb-4 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl flex items-center gap-3 font-bold">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-gray-900">{assistant.name}</div>
                <div className="text-sm font-normal text-blue-600">
                  Voice Assistant
                </div>
              </div>
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-gray-600 font-medium">
              <Building className="w-4 h-4" />
              {assistant.business_name} • {assistant.industry}
            </CardDescription>
          </div>
          {getStatusBadge(assistant)}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Created</p>
              <p className="text-xs text-gray-600">
                {new Date(assistant.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Status</p>
              <p className="text-xs text-green-600">Active</p>
            </div>
          </div>
        </div>

        {getStatusWarnings(assistant).length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-amber-900 text-sm">
                  Configuration Required
                </p>
                {getStatusWarnings(assistant).map((warning, index) => (
                  <p key={index} className="text-sm text-amber-800">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <Link
            href={`/configure-assistant/${assistant.vapi_assistant_id}`}
            className="w-full"
          >
            <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-300">
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
