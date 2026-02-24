import { StoryWorkbench } from "@/components/story/StoryWorkbench";
import { getStoryDataset } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const dataset = await getStoryDataset();
  return <StoryWorkbench dataset={dataset} />;
}
