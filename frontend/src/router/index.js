import { createRouter, createWebHistory } from 'vue-router'
import { trackPageView, trackReferralVisit } from '@/utils/tracker'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '首页 - Vitu Finance' }
  },
  {
    path: '/index',
    name: 'Index',
    component: () => import('../views/Index.vue'),
    meta: { title: '市场行情 - Vitu Finance' }
  },
  {
    path: '/one',
    name: 'OnePage',
    component: () => import('../views/OnePage.vue'),
    meta: { title: '平台介绍 - Vitu Finance' }
  },
  {
    path: '/two',
    name: 'TwoPage',
    component: () => import('../views/TwoPage.vue'),
    meta: { title: '关于平台 - Vitu Finance' }
  },
  {
    path: '/four',
    name: 'FourPage',
    component: () => import('../views/FourPage.vue'),
    meta: { title: '我们的服务 - Vitu Finance' }
  },
  {
    path: '/five',
    name: 'FivePage',
    component: () => import('../views/FivePage.vue'),
    meta: { title: '交易中心 - Vitu Finance' }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue'),
    meta: { title: '关于我们 - Vitu Finance' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: '仪表盘 - Vitu Finance', requiresAuth: true }
  },
  {
    path: '/announcement',
    name: 'Announcement',
    component: () => import('../views/Announcement.vue'),
    meta: { title: 'Announcement - Vitu Finance' }
  },
  {
    path: '/pledge',
    name: 'Pledge',
    component: () => import('../views/Pledge.vue'),
    meta: { title: 'Pledge - Vitu Finance' }
  },
  {
    path: '/robot',
    name: 'Robot',
    component: () => import('../views/Robot.vue'),
    meta: { title: 'AI Robot - Vitu Finance' }
  },
  {
    path: '/robot/caption',
    name: 'RobotCaption',
    component: () => import('../views/RobotCaption.vue'),
    meta: { title: 'Caption - Vitu Finance' }
  },
  {
    path: '/invite',
    name: 'Invite',
    component: () => import('../views/Invite.vue'),
    meta: { title: 'Invite - Vitu Finance' }
  },
  {
    path: '/invite/level-introduction',
    name: 'LevelIntroduction',
    component: () => import('../views/LevelIntroduction.vue'),
    meta: { title: 'Level Introduction - Vitu Finance' }
  },
  {
    path: '/invite/community-members',
    name: 'CommunityMembers',
    component: () => import('../views/CommunityMembers.vue'),
    meta: { title: 'Community Member Details - Vitu Finance' }
  },
  {
    path: '/follow',
    name: 'Follow',
    component: () => import('../views/Follow.vue'),
    meta: { title: 'Follow - Vitu Finance' }
  },
  {
    path: '/wallet',
    name: 'Wallet',
    component: () => import('../views/Assets.vue'),
    meta: { title: 'Wallet - Vitu Finance' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '404 - 页面未找到' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || 'Vitu Finance'

  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    // 这里可以检查用户登录状态
    // const isAuthenticated = checkAuth()
    // if (!isAuthenticated) {
    //   next({ name: 'Home' })
    //   return
    // }
  }

  next()
})

// 全局后置守卫 - 记录页面访问
router.afterEach((to) => {
  // 记录页面访问
  trackPageView(to.name || to.path)
  
  // 检查是否有推荐码参数
  const refCode = to.query.ref
  if (refCode) {
    trackReferralVisit(refCode)
  }
})

export default router
