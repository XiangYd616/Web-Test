/**
 * 权限管理组件
 * 提供角色和权限的可视化管理界面
 * 版本: v1.0.0
 */

import React from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Edit,
  Info,
  Key,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRBAC } from '../../hooks/useRBAC';

// ==================== 类型定义 ====================

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
  scope: string;
  isSystem: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  priority: number;
  inheritFrom?: string[];
  createdAt: string;
  updatedAt: string;
}

interface UserPermissions {
  userId: string;
  roles: string[];
  directPermissions: string[];
  inheritedPermissions: string[];
  effectivePermissions: string[];
  lastCalculated: string;
}

interface PermissionManagerProps {
  userId?: string;
  mode?: 'admin' | 'view';
  onPermissionChange?: (userId: string, permissions: UserPermissions) => void;
}

interface RoleCardProps {
  role: Role;
  permissions: Permission[];
  isSelected?: boolean;
  onSelect?: (role: Role) => void;
  onEdit?: (role: Role) => void;
  onDelete?: (role: Role) => void;
  showActions?: boolean;
}

interface PermissionTreeProps {
  permissions: Permission[];
  selectedPermissions: string[];
  onPermissionToggle: (permissionId: string) => void;
  readonly?: boolean;
}

// ==================== 权限树组件 ====================

const PermissionTree: React.FC<PermissionTreeProps> = ({
  permissions,
  selectedPermissions,
  onPermissionToggle,
  readonly = false
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 按分类组织权限
  const permissionsByCategory = useMemo(() => {
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category]!.push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    return grouped;
  }, [permissions]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'user_management': '用户管理',
      'testing': '测试管理',
      'system': '系统管理',
      'reporting': '报告管理',
      'monitoring': '监控管理'
    };
    return labels[category] || category;
  };

  const getResourceIcon = (resource: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      'user': Users,
      'test': Shield,
      'system': Key,
      'report': Info,
      'monitor': AlertTriangle
    };
    const IconComponent = icons[resource] || Key;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <div className="space-y-2">
      {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => {
        const isExpanded = expandedCategories.has(category);
        const selectedCount = categoryPermissions.filter(p => selectedPermissions.includes(p.id)).length;
        const totalCount = categoryPermissions.length;

        return (
          <div key={category} className="border border-gray-600 rounded-lg">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <span className="font-medium text-white">{getCategoryLabel(category)}</span>
                <span className="text-sm text-gray-400">
                  ({selectedCount}/{totalCount})
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-600 p-3 space-y-2">
                {categoryPermissions.map(permission => (
                  <div
                    key={permission.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-700 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => !readonly && onPermissionToggle(permission.id)}
                      disabled={readonly}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />

                    <div className="flex items-center space-x-2 flex-1">
                      {getResourceIcon(permission.resource)}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {permission.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {permission.description}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                            {permission.resource}:{permission.action}
                          </span>
                          {permission.scope && (
                            <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                              {permission.scope}
                            </span>
                          )}
                          {permission.isSystem && (
                            <span className="text-xs bg-yellow-600 px-2 py-1 rounded">
                              系统
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ==================== 角色卡片组件 ====================

const RoleCard: React.FC<RoleCardProps> = ({
  role,
  permissions,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  showActions = true
}) => {
  const rolePermissions = permissions.filter(p => role.permissions.includes(p.id));
  const permissionsByCategory = rolePermissions.reduce((acc, permission) => {
    acc[permission.category] = (acc[permission.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-colors ${isSelected
        ? 'border-blue-500 bg-blue-900/20'
        : 'border-gray-600 bg-gray-800 hover:border-gray-500'
        }`}
      onClick={() => onSelect?.(role)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role.isSystem ? 'bg-yellow-600' : 'bg-blue-600'
            }`}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-white">{role.name}</h3>
            <p className="text-sm text-gray-400">{role.description}</p>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={(e) => {
                  e?.stopPropagation();
                  onEdit(role);
                }}
                className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                title="编辑角色"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && !role.isSystem && (
              <button
                onClick={(e) => {
                  e?.stopPropagation();
                  onDelete(role);
                }}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                title="删除角色"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">权限数量</span>
          <span className="text-white">{rolePermissions.length}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">优先级</span>
          <span className="text-white">{role.priority}</span>
        </div>

        {role.inheritFrom && role.inheritFrom.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-400">继承自: </span>
            <span className="text-blue-400">{role.inheritFrom.join(', ')}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {Object.entries(permissionsByCategory).map(([category, count]) => (
            <span
              key={category}
              className="text-xs bg-gray-600 px-2 py-1 rounded"
            >
              {category}: {count}
            </span>
          ))}
        </div>

        <div className="flex items-center space-x-2 mt-2">
          {role.isActive ? (
            <span className="flex items-center text-xs text-green-400">
              <Check className="w-3 h-3 mr-1" />
              活跃
            </span>
          ) : (
            <span className="flex items-center text-xs text-red-400">
              <X className="w-3 h-3 mr-1" />
              禁用
            </span>
          )}

          {role.isSystem && (
            <span className="text-xs bg-yellow-600 px-2 py-1 rounded">
              系统角色
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== 主组件 ====================

export const PermissionManager: React.FC<PermissionManagerProps> = ({
  userId,
  mode = 'admin',
  onPermissionChange
}) => {
  const { rbacService, isLoading, error } = useRBAC();
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'users'>('roles');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allRoles = await rbacService.getRoles();
      const allPermissions = await rbacService.getPermissions();

      setRoles(allRoles);
      setPermissions(allPermissions);

      if (userId) {
        const userPerms = await rbacService.getUserPermissions(userId);
        setUserPermissions(userPerms);
      }
    } catch (error) {
      console.error('加载权限数据失败:', error);
    }
  };

  // 过滤角色
  const filteredRoles = useMemo(() => {
    return roles.filter(role =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  // 过滤权限
  const filteredPermissions = useMemo(() => {
    return permissions.filter(permission =>
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.resource.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [permissions, searchTerm]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(selectedRole?.id === role.id ? null : role);
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (!userPermissions || mode !== 'admin') return;

    const newDirectPermissions = userPermissions?.directPermissions.includes(permissionId)
      ? userPermissions?.directPermissions.filter(id => id !== permissionId)
      : [...userPermissions?.directPermissions, permissionId];

    const updatedPermissions: UserPermissions = {
      ...userPermissions,
      directPermissions: newDirectPermissions
    };

    setUserPermissions(updatedPermissions);
    onPermissionChange?.(userId!, updatedPermissions);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">加载失败: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题和搜索 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">权限管理</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e?.target.value)}
              placeholder="搜索角色或权限..."
              className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-600">
        <nav className="flex space-x-8">
          {['roles', 'permissions', 'users'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
            >
              {tab === 'roles' && '角色管理'}
              {tab === 'permissions' && '权限管理'}
              {tab === 'users' && '用户权限'}
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧列表 */}
        <div className="lg:col-span-1 space-y-4">
          {activeTab === 'roles' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">角色列表</h3>
                {mode === 'admin' && (
                  <button className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>新建角色</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredRoles.map(role => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    permissions={permissions}
                    isSelected={selectedRole?.id === role.id}
                    onSelect={handleRoleSelect}
                    showActions={mode === 'admin'}
                  />
                ))}
              </div>
            </>
          )}

          {activeTab === 'permissions' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">权限列表</h3>
                {mode === 'admin' && (
                  <button className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>新建权限</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* 右侧详情 */}
        <div className="lg:col-span-2">
          {activeTab === 'roles' && selectedRole && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white">角色详情</h3>
                {mode === 'admin' && (
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      编辑角色
                    </button>
                    {!selectedRole?.isSystem && (
                      <button className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                        删除角色
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    角色权限
                  </label>
                  <PermissionTree
                    permissions={permissions.filter(p => selectedRole?.permissions.includes(p.id))}
                    selectedPermissions={selectedRole?.permissions}
                    onPermissionToggle={() => { }}
                    readonly={true}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-6">权限树</h3>
              <PermissionTree
                permissions={filteredPermissions}
                selectedPermissions={userPermissions?.directPermissions || []}
                onPermissionToggle={handlePermissionToggle}
                readonly={mode !== 'admin'}
              />
            </div>
          )}

          {activeTab === 'users' && userPermissions && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-6">用户权限详情</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-3">分配的角色</h4>
                  <div className="flex flex-wrap gap-2">
                    {userPermissions?.roles.map(roleId => {
                      const role = roles.find(r => r.id === roleId);
                      return role ? (
                        <span
                          key={roleId}
                          className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
                        >
                          {role.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-3">直接权限</h4>
                  <PermissionTree
                    permissions={permissions}
                    selectedPermissions={userPermissions?.directPermissions}
                    onPermissionToggle={handlePermissionToggle}
                    readonly={mode !== 'admin'}
                  />
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-3">有效权限统计</h4>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">总权限数:</span>
                        <span className="ml-2 text-white">{userPermissions?.effectivePermissions.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">直接权限:</span>
                        <span className="ml-2 text-white">{userPermissions?.directPermissions.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">角色数量:</span>
                        <span className="ml-2 text-white">{userPermissions?.roles.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">最后计算:</span>
                        <span className="ml-2 text-white">
                          {new Date(userPermissions?.lastCalculated).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionManager;
