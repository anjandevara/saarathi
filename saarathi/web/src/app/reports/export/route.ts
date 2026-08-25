import { getCurrentProjectId, getReport } from "@/lib/data";
import { isReportView, reportFileName, reportToMarkdown } from "@/lib/report";

// The markdown export is the real, shareable file. It renders from the same
// report object the screen does, so an export can never disagree with what the
// page showed.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requested = params.get("view") ?? undefined;
  const view = isReportView(requested) ? requested : "daily";
  // An unknown project id falls back to the first configured project, the same
  // way the rest of the app treats a stale selection.
  const project = params.get("project") ?? (await getCurrentProjectId());

  const report = await getReport(view, project);
  return new Response(reportToMarkdown(report), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportFileName(report)}"`,
    },
  });
}
