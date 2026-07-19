import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Hero3D from '@/components/Hero3D'
import { PopularItems } from '@/components/PopularItems'
import type { PopularItem } from '@/components/PopularItems'
import { MenuSection } from '@/components/MenuSection'
import { AboutFooter } from '@/components/AboutFooter'
import { ScrollReveal } from '@/components/ScrollReveal'

import sagePattern from '@/assets/brand/patterns/sage-green/Pattern - Aromia.png'

async function fetchPopular(): Promise<PopularItem[]> {
  const res = await fetch('/api/popular')
  if (!res.ok) throw new Error('Failed to fetch popular items')
  return res.json()
}

function SectionDivider() {
  return (
    <div
      className="h-6 bg-repeat-x opacity-[0.08] sm:h-8"
      style={{
        backgroundImage: `url(${sagePattern})`,
        backgroundSize: 'auto 100%',
      }}
      aria-hidden="true"
    />
  )
}

function LandingPage() {
  const queryClient = useQueryClient()

  const popularQuery = useQuery({
    queryKey: ['popular'],
    queryFn: fetchPopular,
  })

  return (
    <main>
      <Hero3D />
      <SectionDivider />

      <ScrollReveal variant="slide-up" threshold={0.05}>
        <PopularItems
          items={popularQuery.data}
          isLoading={popularQuery.isLoading}
          isError={popularQuery.isError}
          onRetry={() => {
            void queryClient.invalidateQueries({ queryKey: ['popular'] })
          }}
        />
      </ScrollReveal>

      <SectionDivider />
      <ScrollReveal variant="slide-up" threshold={0.05}>
        <MenuSection />
      </ScrollReveal>
      <SectionDivider />
      <ScrollReveal variant="slide-up" threshold={0.05}>
        <AboutFooter />
      </ScrollReveal>
    </main>
  )
}

export const Route = createFileRoute('/')({
  component: LandingPage,
})
