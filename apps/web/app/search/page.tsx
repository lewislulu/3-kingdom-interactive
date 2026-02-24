import { SearchWorkbench } from "@/components/story/SearchWorkbench";
import { getStoryDataset } from "@/lib/data";

export default async function SearchPage() {
  const dataset = await getStoryDataset();
  return <SearchWorkbench dataset={dataset} />;
}
