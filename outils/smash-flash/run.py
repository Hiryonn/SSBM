import os, re, sys, importlib.util
from build_fighter import build
for n in sys.argv[1:]:
    spec_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'specs', n + '.py')
    s = importlib.util.spec_from_file_location(n, spec_path); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    build(m.SPEC, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'projets', 'Super Smash Flash', 'persos', 'ssf-' + re.sub(r'\W+', '-', m.SPEC['name'].lower()) + '.pfchar.json'))
