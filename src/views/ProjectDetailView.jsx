import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import StackIcon from 'tech-stack-icons'
import { HOME_GALLERY_ITEMS } from '../data/homeGalleryItems'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { cldVideoPreviewPoster } from '../lib/cloudinaryUrl.js'
import { getLenis } from '../lib/initLenis.js'
import { formatStackLabel, getProjectTitle } from '../lib/projectLabels.js'

const LOGO_FILLED_SRC =
  'https://res.cloudinary.com/dsy30p7gf/image/upload/v1778581291/Recurso_11estrellarellena_aoc12t.svg'

const LIME_HOVER_FILTER =
  'invert(48%) sepia(95%) saturate(500%) hue-rotate(90deg) brightness(1.1)'

const CORNER_ICON_SIZE =
  `size-[2.2rem] md:size-[2.65rem] lg:size-[3.1rem] shrink-0 ` +
  `desktop-std:lg:size-[2.75rem]`

const DEFAULT_ASPECT_RATIO = 16 / 9

function clampRatio(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return DEFAULT_ASPECT_RATIO
  return Math.min(3.2, Math.max(0.45, ratio))
}

export function buildProportionalGalleryRows(mediaList, aspectRatios, viewportWidth) {
  const count = mediaList.length
  if (count === 0) return []

  const items = mediaList.map((src, index) => ({
    src,
    index,
    ratio: clampRatio(aspectRatios[index] ?? DEFAULT_ASPECT_RATIO),
  }))

  if (viewportWidth < 640) {
    const rows = []
    let i = 0
    while (i < count) {
      if (
        i + 1 < count &&
        items[i].ratio < 0.85 &&
        items[i + 1].ratio < 0.85
      ) {
        rows.push([items[i], items[i + 1]])
        i += 2
      } else {
        rows.push([items[i]])
        i += 1
      }
    }
    return rows
  }

  if (viewportWidth < 1024) {
    const rows = []
    const pattern = [2, 1]
    let step = 0
    let i = 0
    while (i < count) {
      const remaining = count - i
      const desired = pattern[step % pattern.length]
      step += 1

      if (desired === 1 || remaining === 1 || items[i].ratio > 2.2) {
        rows.push([items[i]])
        i += 1
      } else {
        const pairSum = items[i].ratio + items[i + 1].ratio
        if (pairSum > 3.9) {
          rows.push([items[i]])
          i += 1
        } else {
          rows.push([items[i], items[i + 1]])
          i += 2
        }
      }
    }
    return rows
  }

  const rows = []
  const maxRowRatioSum = viewportWidth >= 1280 ? 5.5 : 4.2
  const desktopPattern = count === 4 ? [2, 1, 1] : [2, 1, 3, 2]
  let step = 0
  let i = 0

  while (i < count) {
    const remaining = count - i
    let targetCount = Math.min(desktopPattern[step % desktopPattern.length], remaining)
    step += 1

    if (items[i].ratio >= 2.35) {
      targetCount = 1
    }

    if (targetCount === 3) {
      const sum3 = items[i].ratio + items[i + 1].ratio + items[i + 2].ratio
      if (sum3 > maxRowRatioSum) {
        targetCount = 2
      }
    }

    if (targetCount === 2) {
      const sum2 = items[i].ratio + items[i + 1].ratio
      if (sum2 > maxRowRatioSum) {
        targetCount = 1
      }
    }

    rows.push(items.slice(i, i + targetCount))
    i += targetCount
  }

  return rows
}

function LazyGalleryVideo({ src, label, className, onRatioLoad, immediatePlay = false, controls = false }) {
  const videoRef = useRef(null)
  const poster = useMemo(() => cldVideoPreviewPoster(src), [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || immediatePlay) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      void video.play?.()?.catch?.(() => {})
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play?.()?.catch?.(() => {})
        } else {
          video.pause?.()
        }
      },
      { rootMargin: '160px 0px', threshold: 0.1 },
    )

    observer.observe(video)
    return () => {
      observer.disconnect()
      video.pause?.()
    }
  }, [src, immediatePlay])

  const handleVideoLoaded = (e) => {
    const video = e.currentTarget
    if (video?.videoWidth && video?.videoHeight) {
      onRatioLoad?.(video.videoWidth / video.videoHeight)
    } else {
      onRatioLoad?.(DEFAULT_ASPECT_RATIO)
    }
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className={className}
      aria-label={label}
      autoPlay={immediatePlay}
      preload={immediatePlay ? 'auto' : 'metadata'}
      loop
      muted={!controls}
      playsInline
      controls={controls}
      onLoadedMetadata={handleVideoLoaded}
    />
  )
}

function MediaRenderer({
  src,
  alt,
  className,
  onRatioLoad,
  priority = false,
  immediatePlay = false,
  controls = false,
}) {
  if (!src) return null
  const isVideo = src.match(/\.(mp4|webm|ogg|mov)$/i) || src.includes('/video/upload/')
  const label = alt || 'Medio del proyecto'

  if (isVideo) {
    return (
      <LazyGalleryVideo
        src={src}
        label={label}
        className={className}
        onRatioLoad={onRatioLoad}
        immediatePlay={immediatePlay}
        controls={controls}
      />
    )
  }

  const handleImageLoaded = (e) => {
    const img = e.currentTarget
    if (img?.naturalWidth && img?.naturalHeight) {
      onRatioLoad?.(img.naturalWidth / img.naturalHeight)
    } else {
      onRatioLoad?.(DEFAULT_ASPECT_RATIO)
    }
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      onLoad={handleImageLoaded}
    />
  )
}

export function ProjectDetailView() {
  const { slug } = useParams()
  const project = HOME_GALLERY_ITEMS.find((p) => p.slug === slug) || HOME_GALLERY_ITEMS[0]
  const projectTitle = getProjectTitle(project.slug)
  const projectClient = project?.client || 'Selected Work'
  const projectDescription =
    project?.description ||
    project?.paragraphs?.[0] ||
    'Exploración interactiva y desarrollo web con enfoque editorial.'
  const stackLogos = project?.stack || []

  useDocumentTitle(projectTitle)

  const closeButtonRef = useRef(null)
  const lightboxTriggerRef = useRef(null)

  const galleryMedia = useMemo(
    () =>
      project?.gallery?.length
        ? project.gallery
        : HOME_GALLERY_ITEMS.slice(0, 6).map((item) => item.src),
    [project],
  )

  const [aspectRatios, setAspectRatios] = useState({})
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  )

  useEffect(() => {
    setAspectRatios({})
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0)
    }
    getLenis()?.scrollTo(0, { immediate: true })
  }, [project.slug])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => {
      setViewportWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleRatioLoad = useCallback((index, ratio) => {
    const clamped = clampRatio(ratio)
    setAspectRatios((prev) => {
      if (prev[index] && Math.abs(prev[index] - clamped) < 0.01) return prev
      return { ...prev, [index]: clamped }
    })
  }, [])

  const galleryRows = useMemo(
    () => buildProportionalGalleryRows(galleryMedia, aspectRatios, viewportWidth),
    [galleryMedia, aspectRatios, viewportWidth],
  )

  const similarProjects = useMemo(() => {
    const candidates = HOME_GALLERY_ITEMS.filter((item) => item.slug !== project.slug)
    const shuffled = [...candidates]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled.slice(0, 2)
  }, [project.slug])

  const [lightbox, setLightbox] = useState({ src: null, visible: false, label: '' })

  const openLightbox = (src, label, triggerEl = null) => {
    lightboxTriggerRef.current = triggerEl
    setLightbox({ src, visible: false, label })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLightbox({ src, visible: true, label })
      })
    })
  }

  const closeLightbox = () => {
    setLightbox((prev) => ({ ...prev, visible: false }))
    setTimeout(() => {
      setLightbox({ src: null, visible: false, label: '' })
    }, 400)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeLightbox()
      }
    }

    if (lightbox.src) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
      const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0)
      return () => {
        window.clearTimeout(focusTimer)
        document.body.style.overflow = 'auto'
        window.removeEventListener('keydown', handleKeyDown)
        lightboxTriggerRef.current?.focus?.()
      }
    }

    document.body.style.overflow = 'auto'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [lightbox.src])

  return (
    <main
      id="main-content"
      className="relative flex min-h-[100svh] w-full flex-col overflow-x-hidden bg-[var(--color-portfolio-bg)] text-black"
    >
      <Link
        to="/"
        viewTransition
        aria-label="Volver al inicio"
        className="fixed top-[calc(var(--hero-frame-inset)+env(safe-area-inset-top,0px))] left-[var(--hero-frame-inset)] z-[100] block group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-portfolio-lime"
      >
        <span className={`relative flex cursor-pointer items-start justify-center ${CORNER_ICON_SIZE}`} aria-hidden>
          <img
            src={LOGO_FILLED_SRC}
            alt=""
            draggable={false}
            className="size-full object-contain transition-[filter] duration-200 ease-out"
            style={{ filter: 'none' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = LIME_HOVER_FILTER
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none'
            }}
          />
        </span>
      </Link>

      <div className="fixed top-[calc(var(--hero-frame-inset)+env(safe-area-inset-top,0px))] right-[var(--hero-frame-inset)] z-[100] flex items-center gap-2 md:gap-4">
        {project?.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Ver demo en vivo (se abre en una nueva pestaña)"
            className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-portfolio-lime"
          >
            <span className={`relative flex cursor-pointer items-start justify-center ${CORNER_ICON_SIZE}`} aria-hidden>
              <img
                src="https://res.cloudinary.com/dsy30p7gf/image/upload/v1778924434/Recurso_17live_kky9aj.svg"
                alt=""
                draggable={false}
                className="size-full object-contain transition-[filter] duration-200 ease-out"
                style={{ filter: 'none' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = LIME_HOVER_FILTER
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none'
                }}
              />
            </span>
          </a>
        )}

        {project?.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Ver repositorio en GitHub (se abre en una nueva pestaña)"
            className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-portfolio-lime"
          >
            <span className={`relative flex cursor-pointer items-start justify-center ${CORNER_ICON_SIZE}`} aria-hidden>
              <img
                src="https://res.cloudinary.com/dsy30p7gf/image/upload/v1778924333/Recurso_15github_ukakji.svg"
                alt=""
                draggable={false}
                className="size-full object-contain transition-[filter] duration-200 ease-out"
                style={{ filter: 'none' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = LIME_HOVER_FILTER
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'none'
                }}
              />
            </span>
          </a>
        )}
      </div>

      <section
        aria-label={`Información de ${projectTitle}`}
        className="w-full px-[var(--hero-frame-inset)] pt-[clamp(6.5rem,17svh,11.5rem)] pb-[clamp(2.75rem,7.5svh,5.5rem)]"
      >
        <div className="max-w-[44rem]">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="m-0 font-sans text-[clamp(1.25rem,2.1vw,1.75rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-black">
              {projectTitle}
            </h1>
            <span className="font-sans text-[clamp(0.95rem,1.4vw,1.15rem)] font-medium leading-[1.2] tracking-[-0.01em] text-black/45">
              {projectClient}
            </span>
          </div>

          <p className="m-0 mt-2 font-sans text-[clamp(1.15rem,2vw,1.65rem)] font-normal leading-[1.28] tracking-[-0.015em] text-black/60">
            {projectDescription}
          </p>

          {stackLogos.length > 0 && (
            <div
              className="mt-5 flex flex-wrap items-center gap-3 md:mt-6"
              role="list"
              aria-label="Tecnologías utilizadas"
            >
              {stackLogos.map((iconName, i) => (
                <div
                  key={i}
                  role="listitem"
                  aria-label={formatStackLabel(iconName)}
                  title={formatStackLabel(iconName)}
                  className="flex size-[1.75rem] items-center justify-center p-[2px] grayscale transition-[filter] duration-300 hover:grayscale-0 md:size-[2rem]"
                >
                  <StackIcon name={iconName} className="size-full" aria-hidden />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        aria-label={`Galería de medios de ${projectTitle}`}
        className="w-full px-[var(--hero-frame-inset)] pb-[clamp(4rem,10svh,7.5rem)]"
      >
        <div className="flex w-full flex-col gap-[clamp(1.25rem,2.6vw,2.75rem)]">
          {galleryRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="flex w-full items-stretch gap-[clamp(1.25rem,2.6vw,2.75rem)]"
            >
              {row.map((item) => (
                <button
                  key={item.index}
                  type="button"
                  style={{
                    flexGrow: item.ratio,
                    flexShrink: 1,
                    flexBasis: '0%',
                    aspectRatio: `${item.ratio}`,
                  }}
                  className="relative block min-w-0 cursor-pointer overflow-hidden rounded-[4px] border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-portfolio-lime md:rounded-[6px]"
                  aria-label={`Ampliar medio ${item.index + 1} de ${projectTitle}`}
                  onClick={(e) =>
                    openLightbox(
                      item.src,
                      `${projectTitle}, medio ${item.index + 1}`,
                      e.currentTarget,
                    )
                  }
                >
                  <MediaRenderer
                    src={item.src}
                    alt=""
                    priority={rowIdx === 0}
                    onRatioLoad={(ratio) => handleRatioLoad(item.index, ratio)}
                    className="pointer-events-none block size-full object-contain"
                  />
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="Más trabajos similares"
        className="w-full border-t border-black/15 px-[var(--hero-frame-inset)] pt-[clamp(1.75rem,4svh,3rem)] pb-[calc(clamp(4rem,10svh,7rem)+env(safe-area-inset-bottom,0px))]"
      >
        <h2 className="m-0 font-sans text-[clamp(1.25rem,2vw,1.65rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-black">
          More work
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-[clamp(1.25rem,2.6vw,2.75rem)] sm:grid-cols-2 md:mt-8 lg:grid-cols-3">
          {similarProjects.map((item) => {
            const itemTitle = getProjectTitle(item.slug)
            const itemSubtitle = item.tagline || item.client || ''

            return (
              <Link
                key={item.slug}
                to={`/project/${item.slug}`}
                viewTransition
                aria-label={`Ver proyecto ${itemTitle}`}
                className="block no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-portfolio-lime"
              >
                <div className="aspect-[4/5] w-full overflow-hidden rounded-[4px] bg-transparent md:rounded-[6px]">
                  <img
                    src={item.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="block size-full object-cover"
                  />
                </div>
                <div className="mt-2.5">
                  <p className="m-0 font-sans text-[0.875rem] font-semibold leading-snug text-black md:text-[0.925rem]">
                    {itemTitle}
                  </p>
                  {itemSubtitle && (
                    <p className="m-0 font-sans text-[0.875rem] font-normal leading-snug text-black/55 md:text-[0.925rem]">
                      {itemSubtitle}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {lightbox.src && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.label ? `Vista ampliada: ${lightbox.label}` : 'Vista ampliada'}
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 md:p-12 cursor-zoom-out transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${lightbox.visible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none'}`}
          onClick={closeLightbox}
        >
          <div
            className={`relative max-w-full max-h-full flex items-center justify-center cursor-default transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${lightbox.visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4 opacity-0'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MediaRenderer
              src={lightbox.src}
              alt={lightbox.label || `Vista ampliada de ${projectTitle}`}
              className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
              immediatePlay
              controls={false}
            />
            <button
              ref={closeButtonRef}
              type="button"
              className="absolute top-4 right-4 md:-right-12 md:top-0 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={closeLightbox}
              aria-label="Cerrar vista ampliada"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
