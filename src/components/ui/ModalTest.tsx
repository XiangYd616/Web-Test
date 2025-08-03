import React, { useState } from 'react';
import { AlertTriangle, Info, CheckCircle, Settings } from 'lucide-react';

import { Button, DeleteButton, SecondaryButton } from './Button';
import { Card, CardHeader, CardTitle, CardBody } from './Card';

export const ModalTest: React.FC = () => {
  const [basicModal, setBasicModal] = useState(false);
  const [sizeModal, setSizeModal] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [warningModal, setWarningModal] = useState(false);
  const [infoModal, setInfoModal] = useState(false);
  const [complexModal, setComplexModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);

  const handleConfirmAction = () => {
    alert('确认操作已执行！');
  };

  const handleWarningAction = () => {
    alert('警告操作已执行！');
  };

  const handleInfoAction = () => {
    alert('信息操作已执行！');
  };

  return (
    <div className="p-8 space-y-8 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Modal组件测试展示</h1>

        {/* 基础模态框 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">基础模态框</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button onClick={() => setBasicModal(true)}>
              基础模态框
            </Button>

            <Button onClick={() => setComplexModal(true)} variant="secondary">
              复杂内容模态框
            </Button>

            <Button onClick={() => setSettingsModal(true)} variant="outline">
              设置模态框
            </Button>
          </div>
        </section>

        {/* 不同尺寸 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">不同尺寸</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['xs', 'sm', 'md', 'lg', 'xl', 'full'].map((size) => (
              <Button
                key={size}
                onClick={() => setSizeModal(size)}
                variant="outline"
                size="sm"
              >
                {size.toUpperCase()}
              </Button>
            ))}
          </div>
        </section>

        {/* 确认对话框 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">确认对话框</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DeleteButton onClick={() => setConfirmModal(true)}>
              危险操作确认
            </DeleteButton>

            <Button onClick={() => setWarningModal(true)} className="bg-yellow-600 hover:bg-yellow-700">
              警告确认
            </Button>

            <Button onClick={() => setInfoModal(true)} variant="secondary">
              信息确认
            </Button>
          </div>
        </section>

        {/* 实际应用场景 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">实际应用场景</h2>
          <Card>
            <CardHeader>
              <CardTitle>测试记录操作</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-gray-300 mb-4">
                以下按钮模拟实际应用中的模态框使用场景：
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setBasicModal(true)}>
                  查看详情
                </Button>
                <Button onClick={() => setSettingsModal(true)} variant="secondary">
                  编辑设置
                </Button>
                <DeleteButton onClick={() => setConfirmModal(true)}>
                  删除记录
                </DeleteButton>
              </div>
            </CardBody>
          </Card>
        </section>

        {/* 基础模态框 */}
        <Modal
          isOpen={basicModal}
          onClose={() => setBasicModal(false)}
          title="基础模态框"
          description="这是一个基础的模态框示例"
        >
          <ModalBody>
            <p className="text-gray-300 mb-4">
              这是模态框的内容区域。您可以在这里放置任何内容，包括表单、图片、文本等。
            </p>
            <p className="text-gray-400 text-sm">
              模态框支持键盘导航（ESC关闭、Tab焦点循环）和无障碍功能。
            </p>
          </ModalBody>

          <ModalFooter>
            <SecondaryButton onClick={() => setBasicModal(false)}>
              取消
            </SecondaryButton>
            <Button onClick={() => setBasicModal(false)}>
              确定
            </Button>
          </ModalFooter>
        </Modal>

        {/* 尺寸模态框 */}
        <Modal
          isOpen={!!sizeModal}
          onClose={() => setSizeModal(null)}
          title={`${sizeModal?.toUpperCase()} 尺寸模态框`}
          size={sizeModal as any}
        >
          <ModalBody>
            <p className="text-gray-300">
              这是一个 <strong>{sizeModal}</strong> 尺寸的模态框。
            </p>
            <p className="text-gray-400 text-sm mt-2">
              不同尺寸适用于不同的内容量和使用场景。
            </p>
          </ModalBody>

          <ModalFooter>
            <Button onClick={() => setSizeModal(null)}>
              关闭
            </Button>
          </ModalFooter>
        </Modal>

        {/* 复杂内容模态框 */}
        <Modal
          isOpen={complexModal}
          onClose={() => setComplexModal(false)}
          title="复杂内容模态框"
          description="包含多种内容类型的模态框"
          size="lg"
        >
          <ModalBody>
            <div className="space-y-6">
              {/* 表单示例 */}
              <div>
                <h3 className="text-white font-medium mb-3">表单内容</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">网站URL</label>
                    <input
                      type="url"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">测试类型</label>
                    <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>压力测试</option>
                      <option>性能测试</option>
                      <option>SEO测试</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div>
                <h3 className="text-white font-medium mb-3">测试统计</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-white">156</div>
                    <div className="text-sm text-gray-400">总测试数</div>
                  </div>
                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">98.5%</div>
                    <div className="text-sm text-gray-400">成功率</div>
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <SecondaryButton onClick={() => setComplexModal(false)}>
              取消
            </SecondaryButton>
            <Button onClick={() => setComplexModal(false)}>
              保存设置
            </Button>
          </ModalFooter>
        </Modal>

        {/* 设置模态框 */}
        <Modal
          isOpen={settingsModal}
          onClose={() => setSettingsModal(false)}
          title="系统设置"
          size="md"
        >
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">测试配置</span>
            </div>
          </ModalHeader>

          <ModalBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">自动保存结果</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">邮件通知</span>
                <input type="checkbox" className="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">详细日志</span>
                <input type="checkbox" className="rounded" defaultChecked />
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <SecondaryButton onClick={() => setSettingsModal(false)}>
              取消
            </SecondaryButton>
            <Button onClick={() => setSettingsModal(false)}>
              保存
            </Button>
          </ModalFooter>
        </Modal>

        {/* 确认对话框 */}
        <ConfirmModal
          isOpen={confirmModal}
          onClose={() => setConfirmModal(false)}
          onConfirm={handleConfirmAction}
          title="确认删除"
          message="您确定要删除这条测试记录吗？此操作无法撤销。"
          confirmText="删除"
          cancelText="取消"
          variant="danger"
        />

        <ConfirmModal
          isOpen={warningModal}
          onClose={() => setWarningModal(false)}
          onConfirm={handleWarningAction}
          title="警告操作"
          message="此操作可能会影响系统性能，是否继续？"
          confirmText="继续"
          cancelText="取消"
          variant="warning"
        />

        <ConfirmModal
          isOpen={infoModal}
          onClose={() => setInfoModal(false)}
          onConfirm={handleInfoAction}
          title="信息确认"
          message="是否要保存当前的设置更改？"
          confirmText="保存"
          cancelText="取消"
          variant="info"
        />

        <div className="text-center text-gray-400 text-sm">
          <p>Modal组件测试完成 ✅</p>
          <p className="mt-2">支持焦点管理、键盘导航、动画效果和无障碍功能</p>
        </div>
      </div>
    </div>
  );
};
