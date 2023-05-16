import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'default',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/curveFit.vue')
    },
    {
      path: '/verification',
      name: 'verification',
      component: () => import('../views/verification.vue')
    },
    {
      path: '/curvefit',
      name: 'curvefit',
      component: () => import('../views/curveFit.vue')
    },
    {
      path: '/qsembed',
      name: 'qsembed',
      component: () => import('../views/QsEmbed.vue')
    }
  ]
})

export default router
