import { RequireAuth } from "@/components/layout/require-auth";
import { PostDetailView } from "@/components/posts/post-detail-view";

type PostDetailPageProps = {
  params: {
    postId: string;
  };
};

export default function PostDetailPage({ params }: PostDetailPageProps) {
  return (
    <RequireAuth>
      <PostDetailView postId={params.postId} />
    </RequireAuth>
  );
}
