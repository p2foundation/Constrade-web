'use client';

import { notFound } from 'next/navigation';
import { use } from 'react';
import { ArrowLeft, ArrowRight, Clock, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import guidesData from '@/data/guides.json';

interface GuideContent {
  title: string;
  content: string;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  readTime: string;
  category: string;
  content: {
    sections: GuideContent[];
  };
}

export default function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const guides = guidesData.guides as Guide[];
  const guide = guides.find(g => g.id === slug);

  if (!guide) {
    notFound();
  }

  const currentIndex = guides.findIndex(g => g.id === guide.id);
  const previousGuide = currentIndex > 0 ? guides[currentIndex - 1] : null;
  const nextGuide = currentIndex < guides.length - 1 ? guides[currentIndex + 1] : null;
  const relatedGuides = guides
    .filter(g => g.category === guide.category && g.id !== guide.id)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <section className="border-b border-border bg-muted/30">
        <div className="container-content py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/guides" className="hover:text-foreground transition-colors">
              Guides
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{guide.title}</span>
          </nav>
        </div>
      </section>

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-br from-card via-background to-card py-12">
        <div className="container-content">
          <div className="max-w-4xl mx-auto">
            <Link 
              href="/guides" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Guides
            </Link>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
                  {guide.category}
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              {guide.title}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-6">
              {guide.description}
            </p>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {guide.readTime}
              </div>
              <div>•</div>
              <div>{guide.content.sections.length} sections</div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container-content">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              {guide.content.sections.map((section, index) => (
                <div key={index} className="mb-12">
                  <h2 className="text-2xl font-bold mb-4 text-foreground">
                    {section.title}
                  </h2>
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-16 pt-8 border-t border-border">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                {previousGuide ? (
                  <Link 
                    href={`/guides/${previousGuide.id}`}
                    className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ArrowLeft className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground mb-1">Previous</div>
                      <div className="font-semibold group-hover:text-primary transition-colors">
                        {previousGuide.title}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div />
                )}
                
                {nextGuide ? (
                  <Link 
                    href={`/guides/${nextGuide.id}`}
                    className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all group sm:flex-row-reverse sm:text-right"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Next</div>
                      <div className="font-semibold group-hover:text-primary transition-colors">
                        {nextGuide.title}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Guides */}
      {relatedGuides.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container-content">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-8">Related Guides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedGuides.map((relatedGuide) => (
                  <Link
                    key={relatedGuide.id}
                    href={`/guides/${relatedGuide.id}`}
                    className="group bg-card border border-border rounded-lg p-6 hover:border-primary/50 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {relatedGuide.title}
                      </h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                    </div>
                    <p className="text-muted-foreground mb-4 text-sm">
                      {relatedGuide.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {relatedGuide.readTime}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16">
        <div className="container-content">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Start Investing?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Apply what you've learned and start building wealth with Ghana government securities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Open Account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg font-semibold hover:bg-accent transition-colors"
              >
                View All Guides
                <BookOpen className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
