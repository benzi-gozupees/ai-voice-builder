import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Bot, Calendar, BookOpen, Code, Settings, LogOut, Plus, TestTube, Edit, Copy, AlertTriangle, CheckCircle, Clock, Building, User, Sparkles, Zap, Phone, Play, Activity, EyeIcon, EyeOffIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AccountSettingsSection() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [profileData, setProfileData] = useState({
      name: "",
      email: ""
    });
    
    const [passwordData, setPasswordData] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  
    // Get current user data
    const { data: currentUser } = useQuery({
      queryKey: ["/api/auth/user"],
      queryFn: async () => {
        const response = await fetch("/api/auth/user", {
          credentials: 'include'
        });
        if (!response.ok) throw new Error("Failed to fetch user data");
        return response.json();
      }
    });
  
    // Get assistants with business info
    const { data: assistantsWithBusiness } = useQuery({
      queryKey: ["/api/assistants-with-business"],
      queryFn: async () => {
        const response = await fetch("/api/assistants-with-business", {
          credentials: 'include'
        });
        if (!response.ok) throw new Error("Failed to fetch assistants with business info");
        return response.json();
      }
    });
  
    // Initialize profile data when user data loads
    useEffect(() => {
      if (currentUser) {
        setProfileData({
          name: currentUser.name || "",
          email: currentUser.email || ""
        });
      }
    }, [currentUser]);
  
    // Update profile mutation
    const updateProfileMutation = useMutation({
      mutationFn: async (data: { name: string; email: string }) => {
        const response = await fetch("/api/auth/update-profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to update profile");
        return response.json();
      },
      onSuccess: () => {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully."
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      },
      onError: (error: any) => {
        toast({
          title: "Update failed",
          description: error.message || "Failed to update profile",
          variant: "destructive"
        });
      }
    });
  
    // Password reset mutation
    const passwordResetMutation = useMutation({
      mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
        const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to change password");
        }
        return response.json();
      },
      onSuccess: () => {
        toast({
          title: "Password changed",
          description: "Your password has been changed successfully."
        });
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      },
      onError: (error: any) => {
        toast({
          title: "Password change failed",
          description: error.message || "Failed to change password",
          variant: "destructive"
        });
      }
    });
  
    const handleProfileUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!profileData.name.trim() || !profileData.email.trim()) {
        toast({
          title: "Validation error",
          description: "Name and email are required",
          variant: "destructive"
        });
        return;
      }
      updateProfileMutation.mutate(profileData);
    };
  
    const handlePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        toast({
          title: "Validation error",
          description: "All password fields are required",
          variant: "destructive"
        });
        return;
      }
  
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast({
          title: "Validation error",
          description: "New passwords do not match",
          variant: "destructive"
        });
        return;
      }
  
      if (passwordData.newPassword.length < 8) {
        toast({
          title: "Validation error",
          description: "New password must be at least 8 characters long",
          variant: "destructive"
        });
        return;
      }
  
      passwordResetMutation.mutate({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
    };
  
    return (
      <div className="space-y-6">
        <div className="grid gap-6 max-w-4xl">
          {/* Profile Information */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
  
          {/* Business Information by Assistant */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Business details for each of your AI assistants
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assistantsWithBusiness && assistantsWithBusiness.length > 0 ? (
                <div className="space-y-6">
                  {assistantsWithBusiness.map((assistant: any, index: number) => (
                    <div key={assistant.id} className="space-y-4">
                      {/* Assistant Header */}
                      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">{assistant.name}</h3>
                          <p className="text-sm text-gray-500">AI Voice Assistant</p>
                        </div>
                      </div>
  
                      {/* Business Details */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-600">Business Name</Label>
                          <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-md text-gray-800 font-medium">
                            {assistant.business_name || assistant.businessInfo?.businessName || "Not set"}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-600">Industry</Label>
                          <div className="px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-md text-gray-800">
                            {assistant.industry || assistant.businessInfo?.industry || "Not set"}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-600">Location</Label>
                          <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100 rounded-md text-gray-800">
                            {assistant.location || assistant.businessInfo?.location || "Not set"}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-600">Website</Label>
                          <div className="px-3 py-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-md text-gray-800">
                            {assistant.businessInfo?.website ? (
                              <a 
                                href={assistant.businessInfo.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {assistant.businessInfo.website}
                              </a>
                            ) : "Not set"}
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Business Details */}
                      {assistant.businessInfo && (
                        <div className="space-y-4">
                          <h4 className="text-md font-medium text-gray-700 border-b border-gray-100 pb-2">
                            Additional Details
                          </h4>
                          <div className="grid gap-4">
                            {assistant.businessInfo.description && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-600">Business Description</Label>
                                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 text-sm">
                                  {assistant.businessInfo.description}
                                </div>
                              </div>
                            )}
                            
                            <div className="grid gap-4 md:grid-cols-2">
                              {assistant.businessInfo.contactEmail && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-600">Contact Email</Label>
                                  <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-md text-gray-800">
                                    <a 
                                      href={`mailto:${assistant.businessInfo.contactEmail}`}
                                      className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                      {assistant.businessInfo.contactEmail}
                                    </a>
                                  </div>
                                </div>
                              )}
                              
                              {assistant.businessInfo.contactPhone && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-600">Contact Phone</Label>
                                  <div className="px-3 py-2 bg-green-50 border border-green-100 rounded-md text-gray-800">
                                    <a 
                                      href={`tel:${assistant.businessInfo.contactPhone}`}
                                      className="text-green-600 hover:text-green-800 text-sm"
                                    >
                                      {assistant.businessInfo.contactPhone}
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
  
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Assistant created</span>
                          {assistant.created_at && (
                            <span>
                              {new Date(assistant.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
  
                      {/* Separator between assistants */}
                      {index < assistantsWithBusiness.length - 1 && (
                        <Separator className="my-6" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No Business Information</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first AI assistant to see business information here.
                  </p>
                  <Button 
                    onClick={() => window.location.href = "/quick-setup"}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Create Your First Assistant
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
  
          {/* Password Change */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password for security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter your current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  Password must be at least 8 characters long
                </div>
                
                <Button 
                  type="submit" 
                  disabled={passwordResetMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {passwordResetMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }