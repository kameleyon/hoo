import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BuilderView } from '@/components/BuilderView';
import { REPORTS, reportById } from '@/lib/reports';

export function generateStaticParams() {
  return REPORTS.map((r) => ({ id: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const report = reportById(id);
  if (!report) return {};
  return { title: report.title, description: report.line };
}

export default async function ReportBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = reportById(id);
  if (!report) notFound();

  return <BuilderView report={report} />;
}
