import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { Route } from 'react-router-dom'
import { ProjectDetailView, buildProportionalGalleryRows } from './ProjectDetailView.jsx'
import { renderWithRouter } from '../test/testUtils.jsx'

vi.mock('../lib/initLenis.js', () => ({
  getLenis: () => ({
    scrollTo: vi.fn(),
  }),
}))

vi.mock('tech-stack-icons', () => ({
  default: ({ name }) => <span data-testid="stack-icon">{name}</span>,
}))

describe('ProjectDetailView', () => {
  afterEach(() => {
    document.body.style.overflow = 'auto'
  })

  function renderProject(slug) {
    return renderWithRouter(
      <Route path="/project/:slug" element={<ProjectDetailView />} />,
      { route: `/project/${slug}` },
    )
  }

  it('renders project title, client, description, stack icons, and fixed navbar', () => {
    renderProject('spora')

    expect(screen.getByRole('heading', { level: 1, name: 'Spora' })).toBeInTheDocument()
    expect(screen.getByText('End of Degree Project (TFG)')).toBeInTheDocument()
    expect(screen.getByText(/SPORA is a collaborative/i)).toBeInTheDocument()
    expect(screen.getAllByTestId('stack-icon').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Volver al inicio')).toBeInTheDocument()
  })

  it('renders similar projects in the More work section', () => {
    renderProject('spora')

    expect(screen.getByRole('heading', { level: 2, name: /More work/i })).toBeInTheDocument()
    const similarSection = screen.getByLabelText('Más trabajos similares')
    const links = similarSection.querySelectorAll('a[href^="/project/"]')
    expect(links).toHaveLength(2)
  })

  it('falls back to first project for unknown slug', () => {
    renderProject('unknown-slug')
    expect(screen.getByRole('heading', { level: 1, name: 'Spora' })).toBeInTheDocument()
    expect(screen.getByText(/SPORA is a collaborative/i)).toBeInTheDocument()
  })

  it('opens and closes lightbox when clicking a gallery item', async () => {
    renderProject('spora')

    const tile = screen.getByLabelText('Ampliar medio 1 de Spora')
    fireEvent.click(tile)

    await waitFor(() => {
      const closeBtn = screen.queryByRole('button', { name: 'Cerrar vista ampliada' })
      expect(closeBtn).toBeInTheDocument()
      fireEvent.click(closeBtn)
    })

    fireEvent.keyDown(window, { key: 'Escape' })
  })

  it('renders figma live link for xplorer and omits github link when absent', () => {
    renderProject('xplorer')
    expect(
      screen.getByLabelText('Ver demo en vivo (se abre en una nueva pestaña)'),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Ver repositorio en GitHub (se abre en una nueva pestaña)'),
    ).not.toBeInTheDocument()
  })

  it('builds proportional gallery rows for mobile, tablet, and desktop viewports', () => {
    const media = ['a.png', 'b.png', 'c.png', 'd.png', 'e.png', 'f.png']
    const ratios = { 0: 1.77, 1: 1.0, 2: 1.77, 3: 0.75, 4: 0.75, 5: 1.33 }

    const mobileRows = buildProportionalGalleryRows(media, ratios, 390)
    expect(mobileRows.map((r) => r.length)).toEqual([1, 1, 1, 2, 1])

    const tabletRows = buildProportionalGalleryRows(media, ratios, 768)
    expect(tabletRows.map((r) => r.length)).toEqual([2, 1, 2, 1])

    const desktopRows = buildProportionalGalleryRows(media, ratios, 1440)
    expect(desktopRows.map((r) => r.length)).toEqual([2, 1, 3])
  })
})
