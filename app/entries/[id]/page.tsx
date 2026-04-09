import { EntryDetail } from "@/components/EntryDetail";

type PageProps = { params: Promise<{ id: string }> };

export default async function EntryPage(props: PageProps) {
  const { id } = await props.params;
  return <EntryDetail entryId={id} />;
}
