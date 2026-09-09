# Unseen 技术参考

2026-09-09 公开页面与公开脚本只读研究。来源 https://unseen.co/ 及该页面 vendor.js / theme.js。

首页提供 Enter、Drag to explore、Click & Hold、Projects 等入口。可借鉴的是场景内操作、空间连续性和环境反馈。公开脚本关键词检查如下，仅代表实现线索，不推断专有算法或精确版本：

```json
{
  "vendor": {
    "three": true,
    "WebGLRenderer": true,
    "ShaderMaterial": true,
    "gsap": true,
    "ASScroll": true,
    "uMouse": false,
    "fragmentShader": true,
    "bloom": false,
    "fluid": false
  },
  "theme": {
    "three": true,
    "WebGLRenderer": false,
    "ShaderMaterial": true,
    "gsap": true,
    "ASScroll": true,
    "uMouse": true,
    "fragmentShader": true,
    "bloom": false,
    "fluid": true
  }
}
```

本站采用已有 Three.js 渲染器、GSAP 滚动与真实 HTML，不复制其代码或资产。自然窗景局部水面扰动与镜头微跟随放在 WebGL 层；室内几何、UV、材质与光照基础由 Blender 制作。保留自身纸张、档案、摄影和红线语言。
