import re,sys,json,os
CJK=re.compile(r'[一-鿿　-〿＀-￯]')
COMMENT=re.compile(r'^\s*(//|\*|/\*|\{/\*)')
def dump(paths):
    for p in paths:
        for i,l in enumerate(open(p,encoding='utf8').read().split('\n'),1):
            if re.search(r'[一-鿿]',l) and not COMMENT.match(l):
                print(f"{p}:{i}:{l}")
def apply(mapfile):
    m=json.load(open(mapfile,encoding='utf8'))
    for p,lines in m.items():
        src=open(p,encoding='utf8').read().split('\n')
        for k,v in lines.items():
            src[int(k)-1]=v
        open(p,'w',encoding='utf8').write('\n'.join(src))
    print("applied",sum(len(v) for v in m.values()))
if sys.argv[1]=='dump': dump(sys.argv[2:])
else: apply(sys.argv[2])
