export function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          📐 寻星练习 (Star-Hopping)
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          基于空间拓扑与自适应难度的造型眼力训练系统
        </p>
      </header>

      <main className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 font-medium">项目初始化完成</p>
          <p className="text-xs text-gray-400 mt-1">下一步：开发几何计算库与双 Canvas 渲染组件</p>
        </div>
      </main>
    </div>
  );
}