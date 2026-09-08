'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
type CameraView = {
  position: THREE.Vector3
  target: THREE.Vector3
  near: number
  far: number
}
type CenteredModel = {
  pivot: THREE.Group
  size: THREE.Vector3
}

export default function ModelViewer({ modelUrl, modelType }: { modelUrl: string; modelType?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const resetViewRef = useRef<() => void>(() => undefined)
  const [status, setStatus] = useState<LoadStatus>('idle')

  const type = (modelType || modelUrl.split('.').pop() || 'glb').toLowerCase()
  const supported = type === 'gltf' || type === 'glb'

  useEffect(() => {
    if (!modelUrl || !supported || !mountRef.current) return

    let disposed = false
    let frameId = 0
    let controls: OrbitControlsImpl | null = null
    let resetView: (() => void) | null = null
    let modelPivot: THREE.Group | null = null
    let pointerInside = false
    const container = mountRef.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000)
    const resizeObserver = new ResizeObserver(() => resize())

    setStatus('loading')
    scene.background = new THREE.Color(0x10151d)
    scene.fog = new THREE.Fog(0x10151d, 12, 32)
    camera.position.set(3, 2, 5)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15

    container.replaceChildren(renderer.domElement)
    resizeObserver.observe(container)
    renderer.domElement.addEventListener('pointerenter', handlePointerEnter)
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave)
    renderer.domElement.addEventListener('pointerdown', preventMiddleMouseAction)
    renderer.domElement.addEventListener('contextmenu', preventContextMenu)
    renderer.domElement.addEventListener('auxclick', preventMiddleMouseAction)
    renderer.domElement.addEventListener('mousedown', preventMiddleMouseAction)

    scene.add(new THREE.AmbientLight(0xffffff, 0.52))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4)
    keyLight.position.set(4, 5, 6)
    scene.add(keyLight)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.9)
    fillLight.position.set(-5, 2.5, 3)
    scene.add(fillLight)
    const rimLight = new THREE.DirectionalLight(0xffffff, 2.1)
    rimLight.position.set(-3, 4, -5)
    scene.add(rimLight)
    const topLight = new THREE.PointLight(0xffffff, 1.6, 18)
    topLight.position.set(0, 4.5, 2)
    scene.add(topLight)

    Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]).then(([{ GLTFLoader }, { OrbitControls }]) => {
      if (disposed) return
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.autoRotate = false
      controls.enablePan = true
      controls.enableZoom = true
      controls.rotateSpeed = 0.7
      controls.zoomSpeed = 0.85
      controls.panSpeed = 0.65
      controls.screenSpacePanning = true
      controls.mouseButtons.MIDDLE = undefined
      controls.mouseButtons.RIGHT = THREE.MOUSE.PAN
      controls.minDistance = 0.25
      controls.maxDistance = 80

      new GLTFLoader().load(
        modelUrl,
        gltf => {
          if (disposed) return
          const model = gltf.scene
          applyClayMaterial(model)
          const centered = centerModelOnOrigin(model)
          modelPivot = centered.pivot
          scene.add(modelPivot)
          scene.add(createStageFloor(centered.size))
          const fittedView = fitCameraToObject(camera, modelPivot, controls)
          if (fittedView) {
            resetView = () => {
              if (modelPivot) modelPivot.rotation.set(0, 0, 0)
              camera.position.copy(fittedView.position)
              camera.near = fittedView.near
              camera.far = fittedView.far
              camera.lookAt(fittedView.target)
              camera.updateProjectionMatrix()
              controls?.target.copy(fittedView.target)
              controls?.update()
            }
            resetViewRef.current = resetView
          }
          setStatus('ready')
        },
        undefined,
        () => {
          if (!disposed) setStatus('error')
        },
      )
    }).catch(() => {
      if (!disposed) setStatus('error')
    })

    function resize() {
      const width = container.clientWidth || 800
      const height = container.clientHeight || Math.round(width * 9 / 16)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    function handlePointerEnter() {
      pointerInside = true
    }

    function handlePointerLeave() {
      pointerInside = false
    }

    function preventContextMenu(event: MouseEvent) {
      event.preventDefault()
    }

    function preventMiddleMouseAction(event: MouseEvent) {
      if (event.button === 1) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    function animate() {
      if (disposed) return
      frameId = window.requestAnimationFrame(animate)
      if (modelPivot && !pointerInside) {
        modelPivot.rotation.y += 0.00055
      }
      controls?.update()
      renderer.render(scene, camera)
    }

    resize()
    animate()

    return () => {
      disposed = true
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerenter', handlePointerEnter)
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave)
      renderer.domElement.removeEventListener('pointerdown', preventMiddleMouseAction)
      renderer.domElement.removeEventListener('contextmenu', preventContextMenu)
      renderer.domElement.removeEventListener('auxclick', preventMiddleMouseAction)
      renderer.domElement.removeEventListener('mousedown', preventMiddleMouseAction)
      controls?.dispose()
      if (resetView && resetViewRef.current === resetView) {
        resetViewRef.current = () => undefined
      }
      disposeScene(scene)
      renderer.dispose()
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [modelUrl, supported])

  if (!modelUrl) {
    return (
      <div className="aspect-video rounded-lg bg-[#F0EBE0] flex items-center justify-center text-gray-400 text-sm">
        未提供3D模型
      </div>
    )
  }

  if (!supported) {
    return (
      <div className="aspect-video rounded-lg bg-[#F0EBE0] flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
        <p>模型已上传：{type.toUpperCase()}</p>
        <p className="text-xs">当前在线预览优先支持 GLB / glTF，请从 3DMax 导出为 .glb 后预览。</p>
        <a href={modelUrl} download className="text-[#8B6A1B] hover:text-[#4A3728]">下载模型文件</a>
      </div>
    )
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-[#10151d]">
      <div ref={mountRef} className="h-full w-full cursor-grab touch-none active:cursor-grabbing" />
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => resetViewRef.current()}
          disabled={status !== 'ready'}
          title="重置视角"
          className="rounded-md border border-white/20 bg-[#172033]/80 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur transition hover:bg-[#24324d] disabled:cursor-not-allowed disabled:opacity-45"
        >
          重置视角
        </button>
        <a
          href={modelUrl}
          download
          title="下载模型文件"
          className="rounded-md border border-[#C49A2B]/50 bg-[#C49A2B] px-3 py-1.5 text-xs font-semibold text-[#1a1a2e] shadow-sm transition hover:bg-[#D6B14C]"
        >
          下载模型
        </a>
      </div>
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#10151d]/85 text-white">
          <div className="h-10 w-10 rounded-full border-2 border-[#C49A2B]/30 border-t-[#C49A2B] animate-spin" />
          <p className="text-sm text-white/75">模型加载中…</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F0EBE0] px-4 text-center text-sm text-gray-500">
          <p>模型预览加载失败</p>
          <p className="text-xs">当前页面保留复原图与热点信息，可重新导出 GLB / glTF 后再预览。</p>
          <a href={modelUrl} download className="text-[#8B6A1B] hover:text-[#4A3728]">下载模型文件</a>
        </div>
      )}
    </div>
  )
}

function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  controls: OrbitControlsImpl | null,
): CameraView | null {
  const box = new THREE.Box3().setFromObject(object)
  if (box.isEmpty()) return null

  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z)
  const distance = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
  const direction = new THREE.Vector3(1, 0.65, 1).normalize()

  camera.position.copy(center).add(direction.multiplyScalar(distance * 1.7))
  camera.near = Math.max(distance / 100, 0.01)
  camera.far = distance * 100
  camera.lookAt(center)
  camera.updateProjectionMatrix()

  if (controls) {
    controls.target.copy(center)
    controls.update()
  }

  return {
    position: camera.position.clone(),
    target: center.clone(),
    near: camera.near,
    far: camera.far,
  }
}

function centerModelOnOrigin(model: THREE.Object3D): CenteredModel {
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  model.position.sub(center)

  const pivot = new THREE.Group()
  pivot.add(model)
  return { pivot, size }
}

function createStageFloor(modelSize: THREE.Vector3) {
  const maxSize = Math.max(modelSize.x, modelSize.z, modelSize.y, 1)
  const gridSize = Math.max(maxSize * 2.4, 6)
  const grid = new THREE.GridHelper(gridSize, 18, 0xd8dee8, 0x526071)
  const material = grid.material

  grid.position.y = -modelSize.y / 2
  if (Array.isArray(material)) {
    material.forEach(item => {
      item.transparent = true
      item.opacity = 0.34
    })
  } else {
    material.transparent = true
    material.opacity = 0.34
  }

  return grid
}

function applyClayMaterial(object: THREE.Object3D) {
  const clayMaterial = new THREE.MeshStandardMaterial({
    color: 0x9b9b9b,
    roughness: 0.58,
    metalness: 0.04,
  })

  object.traverse(item => {
    const mesh = item as THREE.Mesh
    if (!mesh.isMesh) return
    disposeMaterial(mesh.material)
    mesh.material = clayMaterial
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
}

function disposeScene(scene: THREE.Scene) {
  const disposedMaterials = new Set<THREE.Material>()

  scene.traverse(object => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    disposeMaterial(mesh.material, disposedMaterials)
  })
}

function disposeMaterial(
  material: THREE.Material | THREE.Material[] | undefined,
  disposedMaterials = new Set<THREE.Material>(),
) {
  if (Array.isArray(material)) {
    material.forEach(item => disposeMaterial(item, disposedMaterials))
    return
  }

  if (!material || disposedMaterials.has(material)) return
  material.dispose()
  disposedMaterials.add(material)
}
