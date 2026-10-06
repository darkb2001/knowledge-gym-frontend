"use client";
import { useLocale } from "@/components/locale";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiRequest, getAccessToken, getApiBase } from "@/lib/api-client";
import { LearningContent } from "@/components/LearningContent";
import { PublicShell, ContentLanguageNotice } from "@/components/ui";

type BlogPost={id:string;title:string;slug:string;body:string;excerpt:string|null;publishedAt:string;likeCount:number;viewCount:number;tags:string[]};
type Comment={id:string;userId:string;parentId:string|null;content:string;createdAt:string;authorDisplayName:string|null;authorAvatarUrl:string|null};

/** Một bình luận: ảnh đại diện, tên người viết, nội dung, thời gian và nút trả lời. */
function CommentItem({comment,formatLocale,onReply,replyLabel}:{comment:Comment;formatLocale:string;onReply:()=>void;replyLabel:string}){
  const name=comment.authorDisplayName?.trim()||"Thành viên Knowledge Gym";
  return <article className="flex gap-3">
    {comment.authorAvatarUrl
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={comment.authorAvatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full border border-line object-cover" />
      : <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-muted text-xs font-semibold text-subtle">{name.slice(0,1).toUpperCase()}</span>}
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-strong">{name}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-body">{comment.content}</p>
      <div className="mt-2 flex items-center gap-3">
        <time className="text-xs text-subtle" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString(formatLocale)}</time>
        <button type="button" className="min-h-8 text-xs font-medium text-accent hover:underline" onClick={onReply}>{replyLabel}</button>
      </div>
    </div>
  </article>;
}

/** Tên hiển thị của người bình luận, có mặc định để không lộ khoảng trắng. */
function memberName(t:(key:string)=>string,comment:Comment){
  return comment.authorDisplayName?.trim()||t("Thành viên Knowledge Gym");
}

export default function BlogPostPage(){
  const { t, formatLocale } = useLocale();
  const params=useParams<{slug:string}>();const slug=params.slug;
  const [post,setPost]=useState<BlogPost|null>(null);const [comments,setComments]=useState<Comment[]>([]);const [content,setContent]=useState("");
  const [loadError,setLoadError]=useState("");const [notice,setNotice]=useState("");const [actionError,setActionError]=useState("");
  const [signedIn,setSignedIn]=useState(false);const [liking,setLiking]=useState(false);const [sending,setSending]=useState(false);
  const [replyTo,setReplyTo]=useState<{id:string;name:string}|null>(null);
  const loginHref = `/login?next=${encodeURIComponent(`/blog/${slug}`)}`;
  useEffect(()=>{setSignedIn(Boolean(getAccessToken()));},[]);
  useEffect(()=>{const controller=new AbortController();setLoadError("");fetch(`${getApiBase()}/blog/posts/${encodeURIComponent(slug)}`,{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error("Không tìm thấy bài viết");return r.json() as Promise<BlogPost>;}).then(value=>{if(!controller.signal.aborted)setPost(value);}).catch(()=>{if(!controller.signal.aborted)setLoadError("Không tìm thấy bài viết");});fetch(`${getApiBase()}/blog/posts/${encodeURIComponent(slug)}/comments`,{signal:controller.signal}).then(r=>r.ok?r.json():[]).then(value=>{if(!controller.signal.aborted)setComments(value);}).catch(()=>{});return()=>controller.abort();},[slug]);
  useEffect(()=>{if(!post||!getAccessToken())return;void apiRequest(`/blog/posts/${encodeURIComponent(slug)}/view`,{method:"POST"}).catch(()=>{});},[post,slug]);
  async function like(){
    if (liking) return;
    if (!signedIn) { setActionError("Đăng nhập để thích bài viết"); return; }
    setLiking(true); setActionError(""); setNotice("");
    try{
      const result=await apiRequest<{liked:boolean;likeCount:number}>(`/blog/posts/${encodeURIComponent(slug)}/like`,{method:"POST"});
      setPost(p=>p?{...p,likeCount:result.likeCount}:p);
      setNotice(result.liked?"Đã thích bài viết":"Đã bỏ thích bài viết");
    }catch(e){
      setActionError(e instanceof Error?e.message:"Đăng nhập để thích bài viết");
    }finally{setLiking(false);}
  }
  async function comment(e:FormEvent){
    e.preventDefault();
    if (sending) return;
    setSending(true); setActionError(""); setNotice("");
    try{
      const created=await apiRequest<Comment>(`/blog/posts/${encodeURIComponent(slug)}/comments`,{method:"POST",body:{content,parentId:replyTo?.id??null}});
      setComments(old=>[...old,created]); setContent(""); setReplyTo(null); setNotice("Đã gửi bình luận.");
    }catch(err){
      setActionError(err instanceof Error?err.message:"Đăng nhập để bình luận");
    }finally{setSending(false);}
  }
  const roots=comments.filter(item=>!item.parentId);
  const repliesOf=(id:string)=>comments.filter(item=>item.parentId===id);

  if (!post) return <PublicShell><div className="space-y-4">
    <Link className="inline-flex min-h-11 items-center text-sm text-accent hover:underline" href="/blog">{t("← Tất cả bài viết")}</Link>
    {loadError ? <p role="alert" className="text-subtle">{t(loadError)}</p> : <p role="status" className="text-subtle">{t("Đang tải bài viết…")}</p>}
  </div></PublicShell>;
  return <PublicShell><div className="kg-reading space-y-7">
    <Link className="inline-flex min-h-11 items-center text-sm text-accent hover:underline" href="/blog">{t("← Tất cả bài viết")}</Link>
    <header className="space-y-4 border-b border-line pb-6"><div className="flex flex-wrap gap-2">{post.tags.map(tag => <span key={tag} className="rounded-md bg-sage/60 px-2.5 py-1 text-xs text-positive">{tag}</span>)}</div><h1 className="text-3xl sm:text-4xl">{post.title}</h1><p className="text-sm text-subtle">{new Date(post.publishedAt).toLocaleDateString(formatLocale)} · {post.viewCount} {t("lượt xem")}</p><div className="flex flex-wrap gap-2"><button type="button" disabled={liking} className="kg-secondary" onClick={() => void like()}>{t("Thích ·")} {post.likeCount}{liking ? " …" : ""}</button><a href="#binh-luan" className="kg-secondary">{t("Bình luận ·")} {comments.length}</a></div><ContentLanguageNotice /></header>
    <LearningContent html={post.body} />
    <section id="binh-luan" className="scroll-mt-24 space-y-4 border-t border-line pt-7">
      <h2 className="text-2xl">{t("Bình luận")} ({comments.length})</h2>
      {roots.length===0
        ? <p className="text-sm text-subtle">{t("Chưa có bình luận nào. Hãy là người đầu tiên!")}</p>
        : <ul className="space-y-3">{roots.map(item=><li key={item.id} className="border-b border-line/70 pb-4">
            <CommentItem comment={item} formatLocale={formatLocale} replyLabel={t("Trả lời")} onReply={()=>setReplyTo({id:item.id,name:memberName(t,item)})} />
            {repliesOf(item.id).map(reply=><div key={reply.id} className="mt-3 border-l-2 border-line/70 pl-3">
              <CommentItem comment={reply} formatLocale={formatLocale} replyLabel={t("Trả lời")} onReply={()=>setReplyTo({id:item.id,name:memberName(t,reply)})} />
            </div>)}
          </li>)}</ul>}
      {signedIn ? <form className="space-y-3" onSubmit={comment}>
        {replyTo && <p className="rounded-sm border border-line/70 bg-muted/40 px-3 py-2 text-xs text-subtle">{t("Đang trả lời")} <span className="font-medium text-strong">{replyTo.name}</span>{" "}<button type="button" className="font-medium text-accent hover:underline" onClick={()=>setReplyTo(null)}>{t("Huỷ")}</button></p>}
        <label htmlFor="blog-comment" className="block text-sm font-medium">{replyTo ? t("Viết câu trả lời…") : t("Viết bình luận…")}</label><textarea id="blog-comment" className="kg-field min-h-28" value={content} onChange={event => setContent(event.target.value)} placeholder={t("Viết bình luận…")} maxLength={5000} required /><button className="kg-button" type="submit" disabled={sending}>{sending ? t("Đang gửi…") : replyTo ? t("Gửi trả lời") : t("Gửi bình luận")}</button></form>
        : <p className="text-sm text-subtle">{t("Đăng nhập để thích và bình luận bài viết.")} <Link href={loginHref} className="font-medium text-accent underline-offset-4 hover:underline">{t("Đăng nhập")}</Link></p>}
      {notice && <p role="status" className="text-sm text-positive">{t(notice)}</p>}
      {actionError && <p role="alert" className="text-sm text-warning">{t(actionError)}{!signedIn && <> <Link href={loginHref} className="font-medium text-accent underline-offset-4 hover:underline">{t("Đăng nhập")}</Link></>}</p>}
    </section>
  </div></PublicShell>;
}
