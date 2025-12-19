/**
 * useIsMobile Composable
 * Detects if the device is mobile based on screen width
 */
import { ref, onMounted, onUnmounted } from 'vue'

export function useIsMobile(breakpoint = 768) {
    const isMobile = ref(false)

    function updateIsMobile() {
        isMobile.value = window.innerWidth < breakpoint
    }

    onMounted(() => {
        updateIsMobile()
        window.addEventListener('resize', updateIsMobile)
    })

    onUnmounted(() => {
        window.removeEventListener('resize', updateIsMobile)
    })

    return {
        isMobile
    }
}

export default useIsMobile

