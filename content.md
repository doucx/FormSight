## [WIP] 换行综合拾色

~~~~~act
patch_file
src/views/ColorDashboard.tsx
~~~~~
~~~~~typescript.old
      {/* 4 个色彩子模式卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
~~~~~
~~~~~typescript.new
      {/* 4 个色彩子模式卡片 (每行 3 个) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
~~~~~
