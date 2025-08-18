/**
 * 数据模型版本控制
 * 管理前后端数据模型的版本兼容性
 * 版本: v1.0.0
 */

// ==================== 版本信息 ====================

export const DATA_MODEL_VERSION = '1.0.0;',
export const API_VERSION = 'v1;',
export const SCHEMA_VERSION = '2024.1; // ==================== 版本兼容性映射 ====================;

export interface VersionInfo     {
  version: string;
  releaseDate: string;
  description: string;
  breaking: boolean;
  deprecated?: string[]
  added?: string[]
  changed?: string[]',
  removed?: string[]',
}
export const VERSION_HISTORY: VersionInfo[] = [;',
  {;
    version: '1.0.0',
    releaseDate: '2024-08-07',
    description: '统一数据模型初始版本',
    breaking: false,
    added: [;
      'common.ts - 统一基础类型定义',
      'testEngines.ts - 测试引擎类型定义',
      'api.ts - API接口类型定义',
      'version.ts - 版本控制机制
    ]
  }
] // ==================== 类型版本映射 ====================

export interface TypeVersionMap     {
  [typeName: string]: {
    currentVersion: string;
    supportedVersions: string[]
    migrationPath?: Record<string, string>
  }
}

export const TYPE_VERSIONS: TypeVersionMap = {;
  'User': {;
    currentVersion: '1.0.0',
    supportedVersions: ['1.0.0'],
    migrationPath: {}
  },
  'TestResult': {;
    currentVersion: '1.0.0',
    supportedVersions: ['1.0.0'],
    migrationPath: {}
  },
  'ApiResponse': {;
    currentVersion: '1.0.0',
    supportedVersions: ['1.0.0'],
    migrationPath: {}
  }
} // ==================== 版本检查工具 ====================

export class VersionChecker {
  /**
   * 检查版本兼容性
   */
  static isCompatible(clientVersion: string, serverVersion: string): boolean {
    const clientMajor = this.getMajorVersion(clientVersion);
    const serverMajor = this.getMajorVersion(serverVersion); // 主版本号必须相同
    return clientMajor === serverMajor
}

  /**
   * 获取主版本号
   */
  static getMajorVersion(version: string): number {;
    return parseInt(version.split('.')[0])
}

  /**
   * 获取次版本号
   */
  static getMinorVersion(version: string): number {;
    return parseInt(version.split('.')[1] || '0")
}
  /**;
   * 获取补丁版本号;
   */;
  static getPatchVersion(version: string): number {;
    return parseInt(version.split('.')[2] || '0")
}
  /**;
   * 比较版本号;
   */;
  static compareVersions(version1: string, version2: string): number {;
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1
}

    return 0
}

  /**
   * 检查是否需要迁移
   */
  static needsMigration(fromVersion: string, toVersion: string): boolean {
    return this.compareVersions(fromVersion, toVersion) < 0
}

  /**
   * 获取迁移路径
   */
  static getMigrationPath(typeName: string, fromVersion: string, toVersion: string): string[] {
    const typeInfo = TYPE_VERSIONS[typeName]
    if (!typeInfo || !typeInfo.migrationPath) {
      
        return []
}

    const path: string[]  = []
    let currentVersion = fromVersion;

    while (currentVersion !== toVersion) {
      const nextVersion = typeInfo.migrationPath[currentVersion]
      if (!nextVersion) {
        throw new Error(`No migration path from ${fromVersion} to ${toVersion} for type ${typeName}`)
}
      path.push(nextVersion);
      currentVersion = nextVersion
}

    return path
}
}

// ==================== 数据迁移接口 ====================

export interface DataMigration<TFrom = any, TTo = any>     {
  fromVersion: string;
  toVersion: string;
  migrate(data: TFrom): TTo;
  validate?(data: TTo): boolean
}

export interface MigrationRegistry     {
  [key: string]: DataMigration[]
}

// ==================== 版本化数据包装器 ====================

export interface VersionedData<T = any>     {
  version: string;
  data: T;
  metadata?: {
    createdAt: string;
    updatedAt: string;
    source: string;
    checksum?: string
}
}

export class VersionedDataWrapper<T = any> {
  constructor(
    public readonly version: string,
    public readonly data: T,
    public readonly metadata?: VersionedData<T>["metadata']
  ) { }`
  /**
   * 创建版本化数据
   */
  static create<T>(data: T, version: string = DATA_MODEL_VERSION): VersionedDataWrapper<T> {
    return new VersionedDataWrapper(version, data, {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),      source: 'client;`';
})
}

  /**
   * 从原始数据创建
   */
  static fromRaw<T>(raw: VersionedData<T>): VersionedDataWrapper<T> {
    return new VersionedDataWrapper(raw.version, raw.data, raw.metadata)
}`
  /**
   * 转换为原始数据
   */
  toRaw(): VersionedData<T> {
    return {
      version: this.version,
      data: this.data,
      metadata: this.metadata
    }
}`
  /**
   * 检查是否需要迁移
   */
  needsMigration(targetVersion: string = DATA_MODEL_VERSION): boolean {
    return VersionChecker.needsMigration(this.version, targetVersion)
}`
  /**
   * 更新数据
   */
  update(newData: Partial<T>): VersionedDataWrapper<T> {
    return new VersionedDataWrapper(
      this.version,
      { ...this.data, ...newData },
      {
        ...this.metadata,
        updatedAt: new Date().toISOString()
      }
    )
}
}`
// ==================== API版本协商 ====================`
export interface ApiVersionNegotiation     {
  clientVersion: string;
  serverVersion: string;
  negotiatedVersion: string;
  compatible: boolean;
  warnings?: string[]
  errors?: string[]
}`
export class ApiVersionNegotiator {
  /**
   * 协商API版本
   */
  static negotiate(
    clientVersion: string,
    serverVersion: string,
    supportedVersions: string[] = [DATA_MODEL_VERSION]
  ): ApiVersionNegotiation {
    const compatible = VersionChecker.isCompatible(clientVersion, serverVersion);
    const warnings: string[]  = []
    const errors: string[]  = []
    let negotiatedVersion = serverVersion;`
    if (!compatible) {
      errors.push(`Client version ${clientVersion} is not compatible with server version ${serverVersion}`);`
      // 尝试找到兼容的版本
      const compatibleVersion = supportedVersions.find(v =>
        VersionChecker.isCompatible(clientVersion, v)
      );`
      if (compatibleVersion) {
        negotiatedVersion = compatibleVersion;
        warnings.push(`Using compatible version ${compatibleVersion} instead of ${serverVersion}`)
}
    }`
    // 检查版本差异
    if (VersionChecker.compareVersions(clientVersion, serverVersion) < 0) {
      warnings.push(`Client version ${clientVersion} is older than server version ${serverVersion}`)
} else if (VersionChecker.compareVersions(clientVersion, serverVersion) > 0) {
      warnings.push(`Client version ${clientVersion} is newer than server version ${serverVersion}`)
}`
    return {
      clientVersion,
      serverVersion,
      negotiatedVersion,
      compatible: errors.length === 0,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined
    }
}
}`
// ==================== 类型安全的版本检查 ====================`
export interface TypeVersionInfo     {
  name: string;
  version: string;
  schema?: any;
  validator?: (data: any) => boolean
}`
export class TypeVersionRegistry {
  private static registry = new Map<string, TypeVersionInfo>();`
  /**
   * 注册类型版本信息
   */
  static register(info: TypeVersionInfo): void {
    this.registry.set(`${info.name}@${info.version}`, info)
}`
  /**
   * 获取类型版本信息
   */
  static get(name: string, version: string): TypeVersionInfo | undefined {
    return this.registry.get(`${name}@${version}`)
}`
  /**
   * 验证数据类型和版本
   */
  static validate(name: string, version: string, data: any): boolean {
    const info = this.get(name, version);
    if (!info) {
      
        return false
}`
    if (info.validator) {
      
        return info.validator(data)
}`
    return true
}`
  /**
   * 获取所有注册的类型
   */
  static getAll(): TypeVersionInfo[] {
    return Array.from(this.registry.values())
}`
  /**
   * 获取类型的所有版本
   */
  static getVersions(name: string): string[] {;
    return Array.from(this.registry.keys());
      .filter(key => key.startsWith(`${name}@`));
      .map(key => key.split("@')[1])
      .sort((a, b) => VersionChecker.compareVersions(b, a)); // 降序排列
  }
}`
// ==================== 自动迁移系统 ====================`
export class AutoMigrationSystem {
  private migrations = new Map<string, DataMigration[]>();
  private registry = TypeVersionRegistry;`
  /**
   * 注册迁移
   */
  registerMigration<TFrom, TTo>(
    typeName: string,
    migration: DataMigration<TFrom, TTo>
  ): void {
    if (!this.migrations.has(typeName)) {
      this.migrations.set(typeName, [])
}
    this.migrations.get(typeName)!.push(migration)
}`
  /**
   * 自动迁移数据
   */
  async migrateData<T>(
    typeName: string,
    data: VersionedData<any>,
    targetVersion: string = DATA_MODEL_VERSION
  ): Promise<VersionedData<T>> {
    if (data.version === targetVersion) {
      
        return data as VersionedData<T>
      }`
    const migrationPath = VersionChecker.getMigrationPath(typeName, data.version, targetVersion);
    let currentData = data;`
    for (const nextVersion of migrationPath) {
      const migration = this.findMigration(typeName, currentData.version, nextVersion);
      if (!migration) {
        throw new Error(`No migration found from ${currentData.version} to ${nextVersion} for type ${typeName}`)
}`
      const migratedData = migration.migrate(currentData.data);`
      // 验证迁移结果
      if (migration.validate && !migration.validate(migratedData)) {
        throw new Error(`Migration validation failed for ${typeName} from ${currentData.version} to ${nextVersion}`)
}

      currentData = {
        version: nextVersion,
        data: migratedData,
        metadata: {
          ...currentData.metadata,
          updatedAt: new Date().toISOString(),
          source: "migration"
}
      }
}`
    return currentData as VersionedData<T>
  }`
  /**
   * 批量迁移
   */
  async migrateBatch<T>(typeName: string,
    dataList: VersionedData<any>[],
    targetVersion: string = DATA_MODEL_VERSION,
    onProgress?: (completed: number, total: number) => void
  ): Promise<VersionedData<T>[]> {
    const results: VersionedData<T>[]  = []
    for (let i = 0; i < dataList.length; i++) {
      const migrated = await this.migrateData<T>(typeName, dataList[i], targetVersion);
      results.push(migrated);
      onProgress?.(i + 1, dataList.length)
}`
    return results
}`
  private findMigration(typeName: string, fromVersion: string, toVersion: string): DataMigration | undefined {
    const migrations = this.migrations.get(typeName) || []
    return migrations.find(m => m.fromVersion === fromVersion && m.toVersion === toVersion)
}
}`
// ==================== 版本兼容性检查器 ====================`
export class CompatibilityChecker {
  /**
   * 检查API兼容性
   */
  static checkApiCompatibility(
    clientVersion: string,
    serverVersion: string,
    endpoints: string[]
  ): {
    compatible: boolean;
    warnings: string[]
    errors: string[]
    supportedEndpoints: string[]
    unsupportedEndpoints: string[]
} {
    const warnings: string[]  = []
    const errors: string[]  = []
    const supportedEndpoints: string[]  = []
    const unsupportedEndpoints: string[]  = []
    const compatible = VersionChecker.isCompatible(clientVersion, serverVersion);`
    if (!compatible) {
      errors.push(`Client version ${clientVersion} is not compatible with server version ${serverVersion}`)
}`
    // 检查端点兼容性（简化实现）
    endpoints.forEach(endpoint => {
      if (compatible) {
        supportedEndpoints.push(endpoint)
} else {
        unsupportedEndpoints.push(endpoint)
}
    });`
    if (VersionChecker.compareVersions(clientVersion, serverVersion) < 0) {
      warnings.push(`Client version ${clientVersion} is older than server version ${serverVersion}. Some features may not be available.`)
}`
    return {
      compatible: errors.length === 0,
      warnings,
      errors,
      supportedEndpoints,
      unsupportedEndpoints
    }
}`
  /**
   * 检查数据模型兼容性
   */
  static checkDataModelCompatibility(
    clientModels: Record<string, string>,
    serverModels: Record<string, string>
  ): {
    compatible: boolean;
    incompatibleModels: string[]
    warnings: string[]
} {
    const incompatibleModels: string[]  = []
    const warnings: string[]  = []
    for (const [modelName, clientVersion] of Object.entries(clientModels)) {
      const serverVersion = serverModels[modelName]`
      if (!serverVersion) {
        warnings.push(`Model ${modelName} not found on server`);
        continue
}`
      if (!VersionChecker.isCompatible(clientVersion, serverVersion)) {
        incompatibleModels.push(modelName)
}
    }`
    return {
      compatible: incompatibleModels.length === 0,
      incompatibleModels,
      warnings
    }
}
}`
// ==================== 导出版本信息 ====================`
export const VERSION_INFO = {
  dataModel: DATA_MODEL_VERSION,
  api: API_VERSION,
  schema: SCHEMA_VERSION,
  compatible: (clientVersion: string) => VersionChecker.isCompatible(clientVersion, DATA_MODEL_VERSION),
  history: VERSION_HISTORY
} // ==================== 默认实例 ====================`
export const autoMigrationSystem = new AutoMigrationSystem();`
// 注册默认的类型版本信息
TypeVersionRegistry.register({;
  name: "User',
  version: '1.0.0',
  validator: (data: any) => {;
    return data && typeof data.id === 'string' && typeof data.email === 'string}});
;
TypeVersionRegistry.register({;
  name: 'TestResult',
  version: '1.0.0',
  validator: (data: any) => {;
    return data && typeof data.id === 'string' && typeof data.testType === 'string}});
;
TypeVersionRegistry.register({;
  name: 'ApiResponse',
  version: '1.0.0',
  validator: (data: any) => {;
    return data && typeof data.success === 'boolean'}`;"});`