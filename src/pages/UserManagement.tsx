import React, { useState } from "react";
import { Helmet } from "react-helmet";
import PageTransition from "@/components/ui-custom/PageTransition";
import { DataTable } from "@/components/ui-custom/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Edit,
  User,
  Mail,
  CheckCircle,
  XCircle,
  Package,
  ToggleLeft,
  ToggleRight,
  Shield,
  Key,
} from "lucide-react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useUsersQuery,
  useAddUser,
  useUpdateUser,
  useToggleUserAccess,
  useChangePassword,
} from "@/hooks/use-users";
import { usePackagesQuery } from "@/hooks/use-packages";
import { useAuth } from "@/context/AuthContext";
import { Column } from "@/types/data-table";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { User as UserType } from "@/integrations/supabase/types";

interface UserFormData {
  name: string;
  email: string;
  role: string;
  password: string;
  assignedPackages: string[];
}

const initialFormData: UserFormData = {
  name: "",
  email: "",
  role: "user",
  password: "",
  assignedPackages: [],
};

const UserManagement = () => {
  const { data: users = [], isLoading } = useUsersQuery();
  const { data: availablePackages = [], isLoading: isLoadingPackages } =
    usePackagesQuery();
  const addMutation = useAddUser();
  const updateMutation = useUpdateUser();
  const toggleMutation = useToggleUserAccess();
  const changePasswordMutation = useChangePassword();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);

  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  const isMobile = useIsMobile();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePackageSelectionChange = (packages: string[]) => {
    setFormData((prev) => ({ ...prev, assignedPackages: packages }));
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormData(initialFormData);
    setOpenDialog(true);
  };

  const handleEditUser = (user: UserType) => {
    setSelectedUser(user);
    setFormData({
      name: user.username || "",
      email: user.email || "",
      role: user.role || "user",
      password: "",
      assignedPackages: user.assignedPackages || [],
    });
    setOpenDialog(true);
  };

  const handleToggleUserAccess = (user: UserType) => {
    toggleMutation.mutate({ id: user.id, active: !user.active });
  };

  const handleChangePassword = (userId: string, newPassword: string) => {
    changePasswordMutation.mutate({ userId, newPassword });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedUser) {
      updateMutation.mutate(
        {
          id: selectedUser.id,
          username: formData.name,
          role: formData.role,
          active: selectedUser.active,
          assignedPackages: formData.assignedPackages,
        },
        { onSuccess: () => setOpenDialog(false) }
      );
    } else {
      addMutation.mutate(
        {
          email: formData.email,
          username: formData.name,
          password: formData.password,
          role: formData.role,
          assignedPackages: formData.assignedPackages,
        },
        { onSuccess: () => setOpenDialog(false) }
      );
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId]);
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleCheckboxChange = (packageId: string, checked: boolean) => {
    if (checked) {
      handlePackageSelectionChange([...formData.assignedPackages, packageId]);
    } else {
      handlePackageSelectionChange(
        formData.assignedPackages.filter((id) => id !== packageId)
      );
    }
  };

  const handleRoleChange = (value: string) => {
    handleSelectChange("role", value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (selectedUser) {
      handleChangePassword(selectedUser.id, passwordData.newPassword);
      setShowPasswordDialog(false);
      setPasswordData({ newPassword: "", confirmPassword: "" });
    }
  };

  const openPasswordDialog = (user: UserType) => {
    setSelectedUser(user);
    setShowPasswordDialog(true);
  };

  const columns: Column[] = [
    {
      header: "Name",
      accessorKey: "username",
      cell: (row: any) => (
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4" />
          <span>{row.username}</span>
        </div>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      cell: (row: any) => (
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4" />
          <span>{row.email}</span>
        </div>
      ),
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: (row: any) => (
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4" />
          <span className="capitalize">{row.role}</span>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "active",
      cell: (row: any) => (
        <div className="flex items-center space-x-2">
          {row.active ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Active</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span>Inactive</span>
            </>
          )}
        </div>
      ),
    },
    {
      header: "Packages",
      accessorKey: "assignedPackages",
      cell: (row: any) => (
        <div className="flex items-center space-x-2">
          <Package className="h-4 w-4" />
          <span>{row.assignedPackages?.length || 0}</span>
        </div>
      ),
    },
  ];

  if (isAdmin) {
    columns.unshift({
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={false}
          onChange={(event) => {
            const isChecked = event.target.checked;
            if (isChecked) {
              const allUserIds = users.map((user) => user.id);
              setSelectedUsers(allUserIds);
            } else {
              setSelectedUsers([]);
            }
          }}
          className="translate-y-[2px] rounded-sm"
        />
      ),
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedUsers.includes(row.id)}
          onChange={(event) => {
            handleSelectUser(row.id, event.target.checked);
          }}
          className="translate-y-[2px] rounded-sm"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    });

    columns.push({
      header: "Actions",
      accessorKey: "actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleEditUser(row)}
            title="Edit user"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => openPasswordDialog(row)}
            title="Change password"
          >
            <Key className="h-4 w-4" />
          </Button>
          <Button
            variant={row.active ? "outline" : "secondary"}
            size="icon"
            onClick={() => handleToggleUserAccess(row)}
            title={row.active ? "Deactivate user" : "Activate user"}
          >
            {row.active ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      ),
    });
  }

  const mobileColumns = isMobile
    ? columns.filter((col) => {
        if (typeof col.header === "string") {
          return ["Name", "Email", "Status", "Actions"].includes(col.header);
        }
        return false;
      })
    : columns;

  return (
    <DashboardLayout>
      <PageTransition>
        <Helmet>
          <title>User Management | Transport </title>
        </Helmet>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                User Management
              </h1>
              <p className="text-muted-foreground">
                Manage and administer users of the application
              </p>
            </div>
            {isAdmin && (
              <div className="flex space-x-2">
                <Button onClick={handleAddUser} disabled={isSubmitting}>
                  <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users List</CardTitle>
              <CardDescription>
                View and manage all users in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <DataTable
                  data={users}
                  columns={mobileColumns}
                  searchKey="username"
                  searchPlaceholder="Search users..."
                />
              )}
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedUser ? "Edit User" : "Add New User"}
                </DialogTitle>
                <DialogDescription>
                  Fill in the details for the user
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter user's name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter user's email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={!!selectedUser}
                    />
                    {selectedUser && (
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed for existing users.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <RadioGroup
                    value={formData.role}
                    onValueChange={handleRoleChange}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="role-admin" />
                      <Label htmlFor="role-admin" className="cursor-pointer">
                        Admin
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="user" id="role-user" />
                      <Label htmlFor="role-user" className="cursor-pointer">
                        User
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {!selectedUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                )}

                {selectedUser && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Account Status</Label>
                    <RadioGroup
                      value={selectedUser.active ? "active" : "inactive"}
                      onValueChange={(value) => {
                        if (selectedUser) {
                          setSelectedUser({
                            ...selectedUser,
                            active: value === "active",
                          });
                        }
                      }}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="active" id="status-active" />
                        <Label
                          htmlFor="status-active"
                          className="cursor-pointer"
                        >
                          Active
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="inactive" id="status-inactive" />
                        <Label
                          htmlFor="status-inactive"
                          className="cursor-pointer"
                        >
                          Inactive
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Assigned Packages</Label>
                  <div className="border rounded-md p-3 h-40 overflow-y-auto">
                    {isLoadingPackages ? (
                      <div className="flex justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      </div>
                    ) : availablePackages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No packages available
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availablePackages.map((pkg) => (
                          <div
                            key={pkg.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`package-${pkg.id}`}
                              checked={formData.assignedPackages.includes(
                                pkg.id
                              )}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(pkg.id, checked === true)
                              }
                            />
                            <label
                              htmlFor={`package-${pkg.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {pkg.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenDialog(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                        {selectedUser ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{selectedUser ? "Update" : "Add"} User</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Change Password Dialog */}
          <Dialog
            open={showPasswordDialog}
            onOpenChange={setShowPasswordDialog}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Change password for {selectedUser?.username}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordDialog(false);
                      setPasswordData({ newPassword: "", confirmPassword: "" });
                    }}
                    disabled={changePasswordMutation?.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={changePasswordMutation?.isPending}
                  >
                    {changePasswordMutation?.isPending ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};

export default UserManagement;
