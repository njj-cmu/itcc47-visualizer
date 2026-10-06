"""Execute trusted sorting programs and publish a reproducible optional payload."""
import argparse
import ast
import contextlib
import copy
import json
from pathlib import Path

from source import (DIRECTORY, PROGRAMS, REGISTRY, Instrument, digest, json_text,
                    selections, source_for, validate_source)
from recorder import Recorder, TeachingLimit

ROOT = DIRECTORY.parents[1]
SCHEMA_VERSION = 1
GENERATOR_VERSION = 'm5c-sorting-1'


def generate(program, mode, fixture, source=None, max_events=2500, max_depth=32, audit=False):
    source = source if source is not None else source_for(program, mode, fixture)
    tree = validate_source(source, program, mode, fixture)
    recorder = Recorder(program, mode, fixture, source, tree, max_events, max_depth, audit)
    instrumented = ast.fix_missing_locations(Instrument().visit(copy.deepcopy(tree)))
    namespace = {'__name__': '__main__', '_observer': recorder}
    outcome = 'completed'
    with contextlib.redirect_stdout(recorder.output):
        try:
            exec(compile(instrumented, PROGRAMS[program], 'exec'), namespace)
        except TeachingLimit as error:
            outcome = 'pedagogical-limit'
            recorder.emit('LIMIT_STOP', str(error), force=True)['frame']['outcome'] = outcome
    if outcome == 'completed':
        recorder.emit('COMPLETE', 'Partition complete; two sides remain.' if program == 'quick' and mode == 'helper'
                      else 'Merge complete: a separate result was returned.' if program == 'merge' and mode == 'helper'
                      else 'Sort complete. The driver has printed the result.')
    result = {'schemaVersion': SCHEMA_VERSION, 'program': program, 'mode': mode, 'fixtureId': fixture['id'],
              'identity': program + ':' + mode + ':' + fixture['id'], 'source': source, 'sourceRevision': digest(source),
              'spans': recorder.spans, 'functions': recorder.functions, 'items': recorder.items,
              'heaps': recorder.heaps, 'events': recorder.events, 'outcome': outcome,
              'inputs': {key: fixture[key] for key in ('values', 'left', 'right', 'low', 'high') if key in fixture}}
    result['traceRevision'] = digest(json_text(result['events']))
    result['heapRevision'] = digest(json_text(result['heaps']))
    result['itemsRevision'] = digest(json_text(result['items']))
    if audit:
        result['observations'] = recorder.observations
    return result


def build():
    fixtures = {program + ':' + mode + ':' + row['id']: generate(program, mode, row)
                for program, mode, row in selections()}
    return {'schemaVersion': SCHEMA_VERSION, 'generatorVersion': GENERATOR_VERSION,
            'catalog': [{'program': p, 'mode': m, 'id': row['id'], 'label': row.get('label', row['id'].replace('-', ' ').capitalize()),
                         'default': row.get('default', False)} for p, m, row in selections()], 'fixtures': fixtures}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    pack = build()
    output = 'const ITCC47SortingTraces = ' + json_text(pack) + ';\n'
    if args.check:
        pointer = json.loads((ROOT / 'activity-packs' / 'sorting-manifest.json').read_text(encoding='utf-8'))
        path = ROOT / pointer['files'][0]
        if path.read_text(encoding='utf-8') != output:
            raise SystemExit('Sorting fixtures drifted. Rebuild the optional pack.')
        print('PASS: 32 reproducible sorting fixtures, canonical source and time-specific heaps.')
    else:
        directory = ROOT / '.sorting-pack-build'
        directory.mkdir(exist_ok=True)
        with (directory / 'sorting-traces.js').open('w', encoding='utf-8', newline='') as stream:
            stream.write(output)
        print('Built {} bounded sorting fixtures: {} bytes.'.format(len(pack['fixtures']), len(output.encode('utf-8'))))


if __name__ == '__main__':
    main()
