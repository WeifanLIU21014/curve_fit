import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/slowsight',
      name: 'slowsight',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/SlowSight.vue')
    },
    {
      path: '/slowsightnoqs',
      name: 'slowsightnoqs',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/SlowSightNoQS.vue')
    },
    {
      path: '/slowsightlocal',
      name: 'slowsightlocal',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/SlowSightLocal.vue')
    },
    {
      path: '/slowsightnoqslocal',
      name: 'slowsightnoqslocal',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/SlowSightNoQSLocal.vue')
    },
    {
      path: '/qsembed',
      name: 'qsembed',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/QsEmbed.vue')
    }
  ]
})

export default router
