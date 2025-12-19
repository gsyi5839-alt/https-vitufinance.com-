/**
 * Performance Monitoring Utility
 * Tracks and reports application performance metrics
 */

/**
 * Initialize performance monitoring
 * Sets up Web Vitals tracking and custom metrics
 */
export function initPerformanceMonitoring() {
    // Check if Performance API is available
    if (typeof window === 'undefined' || !window.performance) {
        console.log('[Performance] Performance API not available')
        return
    }

    // Track page load time
    window.addEventListener('load', () => {
        setTimeout(() => {
            const timing = performance.timing || {}
            const loadTime = timing.loadEventEnd - timing.navigationStart
            if (loadTime > 0) {
                console.log(`[Performance] Page load: ${loadTime}ms`)
            }
        }, 0)
    })

    // Track First Contentful Paint (FCP)
    try {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    console.log(`[Performance] FCP: ${Math.round(entry.startTime)}ms`)
                }
            }
        })
        observer.observe({ entryTypes: ['paint'] })
    } catch (e) {
        // PerformanceObserver not supported
    }

    // Track Long Tasks
    try {
        const longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > 50) {
                    console.warn(`[Performance] Long task: ${Math.round(entry.duration)}ms`)
                }
            }
        })
        longTaskObserver.observe({ entryTypes: ['longtask'] })
    } catch (e) {
        // Long task observation not supported
    }

    console.log('[Performance] Monitoring initialized')
}

/**
 * Measure function execution time
 * @param {string} name - Measurement name
 * @param {Function} fn - Function to measure
 * @returns {any} Function result
 */
export function measureTime(name, fn) {
    const start = performance.now()
    const result = fn()
    const duration = performance.now() - start
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
    return result
}

/**
 * Create performance mark
 * @param {string} name - Mark name
 */
export function mark(name) {
    if (performance && performance.mark) {
        performance.mark(name)
    }
}

/**
 * Measure between two marks
 * @param {string} name - Measurement name
 * @param {string} startMark - Start mark name
 * @param {string} endMark - End mark name
 */
export function measure(name, startMark, endMark) {
    if (performance && performance.measure) {
        try {
            performance.measure(name, startMark, endMark)
            const measures = performance.getEntriesByName(name, 'measure')
            if (measures.length > 0) {
                console.log(`[Performance] ${name}: ${measures[0].duration.toFixed(2)}ms`)
            }
        } catch (e) {
            // Marks might not exist
        }
    }
}

export default {
    initPerformanceMonitoring,
    measureTime,
    mark,
    measure
}
