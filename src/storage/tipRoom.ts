// 팁방: 자유게시판 + 수영장 찾기(자유수영) — Supabase 백엔드 연동.
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './auth';

export interface BoardPost {
  id: string;
  authorId: string;
  authorNickname: string;
  category: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface BoardComment {
  id: string;
  postId: string;
  authorId: string;
  authorNickname: string;
  body: string;
  createdAt: string;
}

export interface Pool {
  id: string;
  name: string;
  region?: string;
  address?: string;
  phone?: string;
  websiteUrl?: string;
  freeSwimNote?: string;
  pricingNote?: string;
}

export const BOARD_CATEGORIES = ['자유', '수영 팁', '수영복', '오늘의 수영복', '자유수영 루틴'];

function postAuthorName(row: any): string {
  return row.profiles?.nickname_ko || row.profiles?.nickname_en || '알 수 없음';
}

export async function getBoardPosts(): Promise<BoardPost[]> {
  const { data, error } = await supabase
    .from('board_posts')
    .select('id, author_id, category, title, body, created_at, profiles(nickname_ko, nickname_en)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map((row) => ({
    id: row.id,
    authorId: row.author_id,
    authorNickname: postAuthorName(row),
    category: row.category,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function createBoardPost(category: string, title: string, body: string): Promise<void> {
  const me = await getCurrentUser();
  if (!me) return;
  await supabase.from('board_posts').insert({ author_id: me.id, category, title, body });
}

export async function deleteBoardPost(id: string): Promise<void> {
  await supabase.from('board_posts').delete().eq('id', id);
}

export async function getComments(postId: string): Promise<BoardComment[]> {
  const { data, error } = await supabase
    .from('board_comments')
    .select('id, post_id, author_id, body, created_at, profiles(nickname_ko, nickname_en)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as any[]).map((row) => ({
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    authorNickname: postAuthorName(row),
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function addComment(postId: string, body: string): Promise<void> {
  const me = await getCurrentUser();
  if (!me) return;
  await supabase.from('board_comments').insert({ post_id: postId, author_id: me.id, body });
}

export async function getPools(): Promise<Pool[]> {
  const { data, error } = await supabase
    .from('pools')
    .select('id, name, region, address, phone, website_url, free_swim_note, pricing_note')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    region: p.region ?? undefined,
    address: p.address ?? undefined,
    phone: p.phone ?? undefined,
    websiteUrl: p.website_url ?? undefined,
    freeSwimNote: p.free_swim_note ?? undefined,
    pricingNote: p.pricing_note ?? undefined,
  }));
}

export interface PoolInput {
  name: string;
  region?: string;
  address?: string;
  phone?: string;
  websiteUrl?: string;
  freeSwimNote?: string;
  pricingNote?: string;
}

export async function addPool(input: PoolInput): Promise<void> {
  const me = await getCurrentUser();
  if (!me) return;
  await supabase.from('pools').insert({
    name: input.name,
    region: input.region || null,
    address: input.address || null,
    phone: input.phone || null,
    website_url: input.websiteUrl || null,
    free_swim_note: input.freeSwimNote || null,
    pricing_note: input.pricingNote || null,
    added_by: me.id,
  });
}
