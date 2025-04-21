
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import PageTransition from "@/components/ui-custom/PageTransition";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  User,
  Settings as SettingsIcon,
  Shield,
  KeyRound,
  Bell,
  Save,
} from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    fullName: "",
    phoneNumber: "",
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    shipmentUpdates: true,
    systemAnnouncements: true,
  });

  // Fetch user profile data
  const { data: profileData } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user settings data
  const { data: userSettings } = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching user settings:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Update profile and settings data when fetched
  useEffect(() => {
    if (profileData) {
      setProfileForm({
        ...profileForm,
        username: profileData.username || user?.username || "",
        fullName: profileData.full_name || "",
        phoneNumber: profileData.phone_number || "",
      });
    }
  }, [profileData, user]);

  useEffect(() => {
    if (userSettings) {
      setNotificationSettings({
        emailNotifications: userSettings.email_notifications,
        smsNotifications: userSettings.sms_notifications,
        shipmentUpdates: userSettings.shipment_updates,
        systemAnnouncements: userSettings.system_announcements,
      });
    }
  }, [userSettings]);

  // Handle profile form input changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle password form input changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle notification toggle changes
  const handleNotificationChange = (name: string, checked: boolean) => {
    setNotificationSettings((prev) => ({ ...prev, [name]: checked }));
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // Update profile in the profiles table
      const { error } = await supabase
        .from("profiles")
        .update({
          username: data.username,
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw new Error(error.message);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      // First validate that passwords match
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("New passwords do not match");
      }
      
      if (data.newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      // Update password through Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw new Error(error.message);

      return true;
    },
    onSuccess: () => {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Password updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update password: ${error.message}`);
    },
  });

  // Update notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: typeof notificationSettings) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // Update notification settings in the user_settings table
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          email_notifications: data.emailNotifications,
          sms_notifications: data.smsNotifications,
          shipment_updates: data.shipmentUpdates,
          system_announcements: data.systemAnnouncements,
          updated_at: new Date().toISOString(),
        });

      if (error) throw new Error(error.message);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      toast.success("Notification settings updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update notification settings: ${error.message}`);
    },
  });

  // Handle profile form submission
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  // Handle password form submission
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePasswordMutation.mutate(passwordForm);
  };

  // Handle notification settings form submission
  const handleNotificationsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateNotificationsMutation.mutate(notificationSettings);
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>Settings | Trasport</title>
        </Helmet>

        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden md:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden md:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden md:inline">Notifications</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>
                    Manage your personal information and account details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex flex-col items-center space-y-4">
                        <Avatar className="h-24 w-24">
                          <AvatarImage
                            src="/placeholder.svg"
                            alt={user?.username || "User"}
                          />
                          <AvatarFallback className="text-2xl">
                            {user?.username?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <Button variant="outline" size="sm" type="button">
                          Change Avatar
                        </Button>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                              id="username"
                              name="username"
                              value={profileForm.username}
                              onChange={handleProfileChange}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={profileForm.email}
                              onChange={handleProfileChange}
                              disabled
                            />
                            <p className="text-xs text-muted-foreground">
                              Email cannot be changed
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                              id="fullName"
                              name="fullName"
                              value={profileForm.fullName}
                              onChange={handleProfileChange}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input
                              id="phoneNumber"
                              name="phoneNumber"
                              value={profileForm.phoneNumber}
                              onChange={handleProfileChange}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Account Role</Label>
                          <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-md">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                              <SettingsIcon className="h-3 w-3 text-primary" />
                            </div>
                            <div className="text-sm">
                              <span className="font-medium capitalize">
                                {user?.role}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {user?.role === "admin"
                                  ? "Full access to all resources and settings"
                                  : "Access to assigned resources and limited settings"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="flex items-center"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your password and security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">
                          Current Password
                        </Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            id="currentPassword"
                            name="currentPassword"
                            type="password"
                            className="pl-10"
                            value={passwordForm.currentPassword}
                            onChange={handlePasswordChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={handlePasswordChange}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">
                            Confirm New Password
                          </Label>
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={handlePasswordChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="bg-muted/50 p-3 rounded-md text-sm">
                        <p className="font-medium">Password Requirements:</p>
                        <ul className="list-disc ml-5 mt-1 space-y-1 text-xs text-muted-foreground">
                          <li>At least 8 characters long</li>
                          <li>Must contain at least one uppercase letter</li>
                          <li>Must contain at least one number</li>
                          <li>Must contain at least one special character</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updatePasswordMutation.isPending}
                        className="flex items-center"
                      >
                        {updatePasswordMutation.isPending ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Manage how you receive notifications and updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={handleNotificationsSubmit}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-col space-y-3">
                        <h3 className="text-sm font-medium">
                          Communication Channels
                        </h3>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label
                              htmlFor="emailNotifications"
                              className="text-base cursor-pointer"
                            >
                              Email Notifications
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Receive notifications via email
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="emailNotifications"
                              checked={notificationSettings.emailNotifications}
                              onCheckedChange={(checked) => 
                                handleNotificationChange("emailNotifications", checked)
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label
                              htmlFor="smsNotifications"
                              className="text-base cursor-pointer"
                            >
                              SMS Notifications
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Receive notifications via SMS
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="smsNotifications"
                              checked={notificationSettings.smsNotifications}
                              onCheckedChange={(checked) => 
                                handleNotificationChange("smsNotifications", checked)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-3 mt-6">
                        <h3 className="text-sm font-medium">
                          Notification Types
                        </h3>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label
                              htmlFor="shipmentUpdates"
                              className="text-base cursor-pointer"
                            >
                              Shipment Updates
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Status changes, delays, and delivery confirmations
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="shipmentUpdates"
                              checked={notificationSettings.shipmentUpdates}
                              onCheckedChange={(checked) => 
                                handleNotificationChange("shipmentUpdates", checked)
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label
                              htmlFor="systemAnnouncements"
                              className="text-base cursor-pointer"
                            >
                              System Announcements
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Platform updates, maintenance, and important
                              notices
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="systemAnnouncements"
                              checked={notificationSettings.systemAnnouncements}
                              onCheckedChange={(checked) => 
                                handleNotificationChange("systemAnnouncements", checked)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateNotificationsMutation.isPending}
                        className="flex items-center"
                      >
                        {updateNotificationsMutation.isPending ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Preferences
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default Settings;
