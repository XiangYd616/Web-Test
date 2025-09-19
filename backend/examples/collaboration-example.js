/**
 * 协作功能使用示例
 * 展示如何使用工作空间管理和实时协作功能
 */

const WorkspaceManager = require('../services/collaboration/WorkspaceManager');
const RealtimeCollaborationServer = require('../services/collaboration/RealtimeCollaborationServer');
const WebSocket = require('ws');

// 初始化管理器
const workspaceManager = new WorkspaceManager();
const collaborationServer = new RealtimeCollaborationServer({ port: 8080 });

/**
 * 示例1: 创建和管理工作空间
 */
async function workspaceExample() {
  console.log('\n🔵 示例1: 创建和管理工作空间\n');
  
  // 创建用户
  const users = [
    { id: 'user1', name: 'Alice', email: 'alice@example.com' },
    { id: 'user2', name: 'Bob', email: 'bob@example.com' },
    { id: 'user3', name: 'Charlie', email: 'charlie@example.com' }
  ];
  
  users.forEach(user => workspaceManager.users.set(user.id, user));
  
  // 创建工作空间
  const workspace = await workspaceManager.createWorkspace('user1', {
    name: 'API 测试项目',
    description: '团队协作的 API 测试项目',
    type: 'team',
    visibility: 'private',
    features: {
      realTimeCollaboration: true,
      versionControl: true,
      commenting: true
    }
  });
  
  console.log(`✅ 创建工作空间: ${workspace.name}`);
  console.log(`   ID: ${workspace.id}`);
  console.log(`   创建者: ${workspace.createdBy}`);
  
  // 邀请成员
  const invitation1 = await workspaceManager.inviteMember(
    workspace.id, 
    'user1', 
    'bob@example.com', 
    'editor'
  );
  
  const invitation2 = await workspaceManager.inviteMember(
    workspace.id,
    'user1',
    'charlie@example.com',
    'viewer'
  );
  
  console.log('\n📧 发送邀请:');
  console.log(`   - Bob (Editor): ${invitation1.token}`);
  console.log(`   - Charlie (Viewer): ${invitation2.token}`);
  
  // 接受邀请
  await workspaceManager.acceptInvitation(invitation1.token, 'user2');
  await workspaceManager.acceptInvitation(invitation2.token, 'user3');
  
  console.log('\n👥 工作空间成员:');
  workspace.members.forEach((member, userId) => {
    const user = workspaceManager.users.get(userId);
    console.log(`   - ${user.name} (${member.role})`);
  });
  
  return workspace;
}

/**
 * 示例2: 资源管理和权限控制
 */
async function resourceManagementExample(workspace) {
  console.log('\n🔵 示例2: 资源管理和权限控制\n');
  
  // 创建不同类型的资源
  const collection = await workspaceManager.createResource(
    workspace.id,
    'user1',
    'collection',
    {
      name: '用户管理 API',
      description: '用户相关的所有 API 接口',
      data: {
        requests: [],
        folders: []
      }
    }
  );
  
  const environment = await workspaceManager.createResource(
    workspace.id,
    'user2',
    'environment',
    {
      name: '开发环境',
      description: '本地开发环境配置',
      data: {
        variables: [
          { key: 'baseUrl', value: 'http://localhost:3000' },
          { key: 'apiKey', value: 'dev-key-123' }
        ]
      }
    }
  );
  
  const testCase = await workspaceManager.createResource(
    workspace.id,
    'user1',
    'test',
    {
      name: '登录测试',
      description: '测试用户登录功能',
      data: {
        request: {
          method: 'POST',
          url: '{{baseUrl}}/auth/login',
          body: {
            username: 'testuser',
            password: 'testpass'
          }
        },
        assertions: [
          { type: 'status', expected: 200 },
          { type: 'response.body', path: 'token', exists: true }
        ]
      }
    }
  );
  
  console.log('📄 创建的资源:');
  console.log(`   - Collection: ${collection.name} (${collection.id})`);
  console.log(`   - Environment: ${environment.name} (${environment.id})`);
  console.log(`   - Test: ${testCase.name} (${testCase.id})`);
  
  // 尝试不同权限的操作
  try {
    // Editor 可以更新资源
    await workspaceManager.updateResource(
      workspace.id,
      'user2',
      'collection',
      collection.id,
      { name: '用户管理 API v2' },
      { acquireLock: true }
    );
    console.log('\n✅ Editor 成功更新资源');
  } catch (error) {
    console.log('\n❌ Editor 更新失败:', error.message);
  }
  
  try {
    // Viewer 不能更新资源
    await workspaceManager.updateResource(
      workspace.id,
      'user3',
      'collection',
      collection.id,
      { name: '用户管理 API v3' }
    );
  } catch (error) {
    console.log('❌ Viewer 更新失败:', error.message);
  }
  
  return { collection, environment, testCase };
}

/**
 * 示例3: 评论和活动
 */
async function commentingExample(workspace, resources) {
  console.log('\n🔵 示例3: 评论和活动\n');
  
  // 添加评论
  const comment1 = await workspaceManager.addComment(
    workspace.id,
    'user1',
    'resource',
    resources.collection.id,
    '这个集合需要添加更多的测试用例 @user2'
  );
  
  const comment2 = await workspaceManager.addComment(
    workspace.id,
    'user2',
    'comment',
    comment1.id,
    '好的，我来添加测试用例',
    comment1.id  // 回复
  );
  
  const comment3 = await workspaceManager.addComment(
    workspace.id,
    'user3',
    'resource',
    resources.environment.id,
    '开发环境的 API Key 需要更新'
  );
  
  console.log('💬 评论:');
  workspace.comments.forEach(comment => {
    const user = workspaceManager.users.get(comment.userId);
    console.log(`   - ${user.name}: ${comment.content}`);
    if (comment.mentions.length > 0) {
      console.log(`     提及: ${comment.mentions.join(', ')}`);
    }
  });
  
  // 查看活动历史
  const activities = workspaceManager.getWorkspaceActivities(workspace.id, 10);
  console.log('\n📊 最近活动:');
  activities.forEach(activity => {
    console.log(`   - ${activity.type}: ${JSON.stringify(activity.data)}`);
  });
}

/**
 * 示例4: 实时协作
 */
async function realtimeCollaborationExample() {
  console.log('\n🔵 示例4: 实时协作\n');
  
  // 启动协作服务器
  collaborationServer.start();
  
  // 模拟多个客户端连接
  const clients = [];
  const roomId = 'workspace-123';
  
  // 创建客户端连接
  for (let i = 0; i < 3; i++) {
    const ws = new WebSocket('ws://localhost:8080');
    const userId = `user${i + 1}`;
    const userName = ['Alice', 'Bob', 'Charlie'][i];
    
    ws.on('open', () => {
      console.log(`👤 ${userName} 连接成功`);
      
      // 加入房间
      ws.send(JSON.stringify({
        type: 'join_room',
        roomId,
        userId,
        userName,
        role: i === 0 ? 'owner' : 'editor'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'connect':
          console.log(`   ${userName} 获得客户端ID: ${message.clientId}`);
          break;
          
        case 'room_info':
          console.log(`   ${userName} 加入房间，当前成员: ${message.members.length}`);
          break;
          
        case 'user_status':
          if (message.status === 'joined') {
            console.log(`   📢 ${message.userName} 加入了房间`);
          }
          break;
          
        case 'cursor_move':
          console.log(`   🖱️ ${message.userName} 移动光标到 ${JSON.stringify(message.position)}`);
          break;
          
        case 'content_change':
          console.log(`   ✏️ ${message.userName} 修改了内容`);
          break;
      }
    });
    
    clients.push({ ws, userId, userName });
  }
  
  // 等待连接建立
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 模拟协作操作
  console.log('\n🎯 模拟协作操作:\n');
  
  // Alice 移动光标
  clients[0].ws.send(JSON.stringify({
    type: 'cursor_move',
    roomId,
    position: { line: 10, column: 15 }
  }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Bob 修改内容
  clients[1].ws.send(JSON.stringify({
    type: 'content_change',
    roomId,
    resourceId: 'doc-1',
    changes: {
      type: 'insert',
      position: { line: 5, column: 0 },
      text: '// 新添加的注释\n'
    },
    version: 1
  }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Charlie 获取锁
  clients[2].ws.send(JSON.stringify({
    type: 'acquire_lock',
    roomId,
    resourceId: 'doc-1',
    lockType: 'edit'
  }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 添加评论
  clients[0].ws.send(JSON.stringify({
    type: 'comment',
    roomId,
    resourceId: 'doc-1',
    comment: {
      content: '这里需要优化性能'
    }
  }));
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 清理
  clients.forEach(client => client.ws.close());
  
  return collaborationServer;
}

/**
 * 示例5: 工作空间统计
 */
async function workspaceStatistics(workspace) {
  console.log('\n🔵 示例5: 工作空间统计\n');
  
  const stats = workspaceManager.getWorkspaceStatistics(workspace.id);
  
  console.log('📈 工作空间统计:');
  console.log(`   名称: ${stats.name}`);
  console.log(`   成员数: ${stats.memberCount}`);
  console.log(`   在线成员: ${stats.onlineMembers}`);
  console.log(`   资源统计:`);
  console.log(`     - Collections: ${stats.resources.collections}`);
  console.log(`     - Environments: ${stats.resources.environments}`);
  console.log(`     - Requests: ${stats.resources.requests}`);
  console.log(`     - Tests: ${stats.resources.tests}`);
  console.log(`   最后活动: ${stats.activity.lastActivity}`);
  console.log(`   总活动数: ${stats.activity.totalActivities}`);
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('🚀 Test-Web 协作功能示例');
  console.log('='.repeat(60));
  
  try {
    // 创建工作空间
    const workspace = await workspaceExample();
    
    // 资源管理
    const resources = await resourceManagementExample(workspace);
    
    // 评论功能
    await commentingExample(workspace, resources);
    
    // 实时协作
    const server = await realtimeCollaborationExample();
    
    // 统计信息
    await workspaceStatistics(workspace);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有示例运行完成！');
    console.log('='.repeat(60));
    
    // 清理
    server.stop();
    workspaceManager.cleanup();
    
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  }
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  workspaceExample,
  resourceManagementExample,
  commentingExample,
  realtimeCollaborationExample,
  workspaceStatistics,
  runAllExamples
};
