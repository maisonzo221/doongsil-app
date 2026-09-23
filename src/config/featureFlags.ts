// 기능 on/off 스위치.
// 수친/수모임(채팅)은 서버 비용이 드는 기능이지만, 요청에 따라 지금은 켜둔다.
// 나중에 과금 이슈 등으로 다시 숨기고 싶으면 false로만 바꾸면 된다.
export const FEATURE_FLAGS = {
  friendsAndChat: true,
};
