module.exports = {
  base: '/OcelotSignMod_Docs/',
  title: '迷上城建与豹猫指示牌模组',
  description: 'MishangUC & Ocelot Sign Mod Documentation',
  theme: 'hope',
  locales: {
    '/': {
      lang: 'zh-CN',
      title: '迷上城建与豹猫指示牌模组',
      description: 'MishangUC & Ocelot Sign Mod 文档'
    },
    '/en/': {
      lang: 'en-US',
      title: 'MishangUC & Ocelot Sign Mod',
      description: 'MishangUC & Ocelot Sign Mod Documentation'
    }
  },
  themeConfig: {
    themeColor: '#2188ff',
    editLinks: false,
    lastUpdated: false,
    contributors: false,
    sidebarDepth: 2,
    blog: false,
    feed: false,
    locales: {
      '/': {
        label: '简体中文',
        selectText: '选择语言',
        nav: [
          {
            text: '文档',
            items: [
              { text: '主页', link: '/' },
              { text: '告示牌基本使用方法', link: '/guide/sign-usage.html' },
              { text: '制作字体图案资源包', link: '/guide/resource-pack.html' },
              { text: '极其少见的交通标志解释', link: '/guide/rare-traffic-signs.html' },
              { text: '创意广场', link: '/guide/creative-plaza.html' },
              { text: '免责声明与常见问题', link: '/guide/disclaimer-faq.html' }
            ]
          }
        ],
        sidebar: [
          {
            title: '迷上城建与豹猫指示牌模组',
            path: '/',
            collapsable: false,
            children: [
              ['/', '主页'],
              ['/guide/sign-usage.html', '告示牌基本使用方法'],
              ['/guide/resource-pack.html', '制作字体图案资源包'],
              ['/guide/rare-traffic-signs.html', '极其少见的交通标志解释'],
              ['/guide/creative-plaza.html', '创意广场'],
              ['/guide/disclaimer-faq.html', '免责声明与常见问题']
            ]
          }
        ]
      },
      '/en/': {
        label: 'English',
        selectText: 'Languages',
        nav: [
          {
            text: 'Documentation',
            items: [
              { text: 'Home', link: '/en/' },
              { text: 'Basic Usage of Signs', link: '/en/guide/sign-usage.html' },
              { text: 'Custom Font & Texture Resource Pack', link: '/en/guide/resource-pack.html' },
              { text: 'Rare Traffic Signs Explained', link: '/en/guide/rare-traffic-signs.html' },
              { text: 'Creative Plaza', link: '/en/guide/creative-plaza.html' },
              { text: 'Disclaimer & FAQ', link: '/en/guide/disclaimer-faq.html' }
            ]
          }
        ],
        sidebar: [
          {
            title: 'MishangUC & Ocelot Sign Mod',
            path: '/en/',
            collapsable: false,
            children: [
              ['/en/', 'Home'],
              ['/en/guide/sign-usage.html', 'Basic Usage of Signs'],
              ['/en/guide/resource-pack.html', 'Custom Font & Texture Resource Pack'],
              ['/en/guide/rare-traffic-signs.html', 'Rare Traffic Signs Explained'],
              ['/en/guide/creative-plaza.html', 'Creative Plaza'],
              ['/en/guide/disclaimer-faq.html', 'Disclaimer & FAQ']
            ]
          }
        ]
      }
    }
  }
}