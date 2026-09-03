import { useEffect, useRef } from 'react'
import { createRobot } from '../lib/robot'
import markUrl from '../assets/brand/mark-blue-on-dark.svg'

type RobotHandle = {
  setTarget: (x: number, y: number, size: number) => void
  setSection: (i: number) => void
  setGaze: (x: number | null, y: number | null) => void
  setCoverEyes: (active: boolean) => void
  setShell: (name: 'light' | 'dark') => void
  dispose: () => void
}

/**
 * The WallsTeam mascot from the marketing site, ported to stand watch over the login form.
 * It wakes up once mounted, follows the cursor, and covers its eyes while `coverEyes` is set —
 * used to look away while a password is being typed.
 */
export default function CompanionRobot({ className, coverEyes }: { className?: string; coverEyes?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const robotRef = useRef<RobotHandle | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const robot = createRobot(canvas, { shell: 'light', markUrl }) as RobotHandle
    robotRef.current = robot

    const wake = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      robot.setTarget(w / 2, h / 2, Math.min(w, h) * 1.05)
      robot.setSection(0)
    }
    // Let the canvas take its layout size before the first frame reads clientWidth/Height.
    const raf = requestAnimationFrame(wake)

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect()
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1
      const ny = -(((e.clientY - r.top) / r.height) * 2 - 1)
      robot.setGaze(nx, ny)
    }
    const onLeave = () => robot.setGaze(null, null)

    window.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerleave', onLeave)
      robotRef.current = null
      robot.dispose()
    }
  }, [])

  useEffect(() => {
    robotRef.current?.setCoverEyes(!!coverEyes)
  }, [coverEyes])

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  )
}
