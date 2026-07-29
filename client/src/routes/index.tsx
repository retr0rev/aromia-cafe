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
    <div className="relative py-1">
      <div
        className="h-8 bg-repeat-x opacity-[0.06] sm:h-10"
        style={{
          backgroundImage: `url(${sagePattern})`,
          backgroundSize: 'auto 100%',
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-transparent" />
    </div>
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

      <div className="relative bg-gradient-to-b from-sage-50/50 to-white">
        <SectionDivider />

        <ScrollReveal variant="slide-up" threshold={0.05} duration={700}>
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

        <ScrollReveal variant="fade-in" threshold={0.03} duration={800}>
          <MenuSection />
        </ScrollReveal>

        <SectionDivider />

        <ScrollReveal variant="slide-up" threshold={0.05} duration={700}>
          <AboutFooter />
        </ScrollReveal>
      </div>
    </main>
  )
}

export const Route = createFileRoute('/')({
  component: LandingPage,
})
