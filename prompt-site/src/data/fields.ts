// 분야 목록. 프롬프트 파일의 "분야" 값은 여기 name과 같아야 합니다.
export interface Field {
  slug: string;
  name: string;
  description: string;
  icon: 'code' | 'chart' | 'document' | 'layout' | 'pen' | 'book' | 'chat';
  /** 분야 페이지에서 상황을 보여줄 순서. 여기 없는 상황은 뒤에 붙습니다. */
  situations: string[];
}

export const fields: Field[] = [
  { slug: 'dev', name: '개발', description: 'AI에게 프로그램을 만들거나 고치게 할 때', icon: 'code', situations: ['새 프로그램을 만들 때', '기능을 추가할 때', '오류를 고칠 때', '코드를 점검할 때', '출시하기 전에', '되돌리기 어려운 작업을 할 때'] },
  { slug: 'biz', name: '사업 기획', description: '아이템을 사업으로 낼 만한지 따져볼 때', icon: 'chart', situations: ['아이템을 검증할 때', '시장 규모를 추정할 때', '경쟁 서비스를 조사할 때', '출시 타이밍을 볼 때'] },
  { slug: 'bizplan', name: '사업계획서', description: '지원사업, 투자, 대출 심사에 낼 문서를 쓸 때', icon: 'document', situations: ['지원사업 신청서를 쓸 때', '투자·대출용 계획서를 쓸 때', '쓴 계획서를 점검할 때'] },
  { slug: 'design', name: '디자인', description: '화면 구성, 디자인 방향, 화면 문구를 정할 때', icon: 'layout', situations: ['화면 구성을 요청할 때', '디자인 방향을 정할 때', '화면 문구를 쓸 때'] },
  { slug: 'writing', name: '글쓰기·업무', description: '보고서, 이메일, 문서 검토, 사실 확인', icon: 'pen', situations: ['보고서를 쓸 때', '이메일을 쓸 때', '문서를 검토할 때', '사실을 확인할 때'] },
  { slug: 'learning', name: '학습', description: '개념을 배우고 내 이해가 맞는지 확인할 때', icon: 'book', situations: ['개념을 배울 때', '내 이해를 확인할 때', '반박을 연습할 때'] },
  { slug: 'daily', name: '일상', description: '개발 규칙이 끼어들면 안 되는 일반 요청', icon: 'chat', situations: ['추천을 받을 때', '결정을 고민할 때'] },
];

export const fieldNames = fields.map((field) => field.name);
