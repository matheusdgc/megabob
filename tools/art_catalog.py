"""Explicit source cells and game dimensions for the complete generated art lot."""
from sprites import FX_SHEETS


def cells(row, indices):
    return [(row, i) for i in indices]


def spec(group, key, source, cols, rows, selection, size, fit=None, **options):
    return dict(group=group, key=key, source=source + '.png', cols=cols, rows=rows,
                selection=selection, size=size, fit=fit or size,
                mode=options.pop('mode', 'runs' if rows == 1 and cols > 1 else 'grid'), **options)


def catalog():
    out = []
    # Preserve existing runtime keys and dimensions, including charge auras.
    for source, cols, rows, animations in FX_SHEETS:
        for key, row, indices, size, fit in animations:
            if key != 'fx_hit':  # actual hit spark comes from FX3, not the compiler impact
                out.append(spec('fx', key, 'fx/' + source, cols, rows, cells(row, indices), size, fit))
    legacy_keys = {entry['key'] for entry in out}
    for source, cols, rows, animations in [
        ('FX3_explosions', 6, 4, [
            ('fx_hit', 0, 3, (16, 16)), ('fx_explosion', 1, 5, (32, 32)),
            ('fx_boss_explosion', 2, 6, (64, 64)), ('fx_deflect', 3, 3, (16, 16))]),
        ('FX4_movement', 6, 4, [
            ('fx_dash_dust', 0, 4, (32, 16)), ('fx_wall_dust', 1, 3, (16, 24)),
            ('fx_land_dust', 2, 3, (32, 16)), ('fx_decompile', 3, 6, (48, 48))]),
    ]:
        for key, row, count, size in animations:
            if key not in legacy_keys:
                out.append(spec('fx', key, 'fx/' + source, cols, rows, cells(row, range(count)), size))
    for i, name in enumerate(['health_small', 'health_large', 'energy_small', 'energy_large', 'life']):
        size = (12, 12) if name.endswith('small') else (20, 20)
        out.append(spec('fx', 'pickup_' + name, 'fx/FX5_pickups', 10, 1,
                        cells(0, [i * 2, i * 2 + 1]), size))

    enemies = [
        ('E1_pixel_mite', 'pixel_mite', 3, (24, 24), (20, 16)),
        ('E2_spam_drone', 'spam_drone', 3, (32, 32), (24, 24)),
        ('E3_drip', 'drip', 4, (32, 40), (28, 36)),
        ('E4_heap_crab', 'heap_crab', 4, (40, 32), (36, 28)),
        ('E5_thread_runner', 'thread_runner', 3, (48, 32), (44, 28)),
        ('E6_clock_spike', 'clock_spike', 4, (32, 32), (28, 28)),
        ('E7_void_eye', 'void_eye', 4, (32, 32), (26, 26)),
        ('E8_dangling_ref', 'dangling_ref', 3, (40, 48), (34, 40)),
        ('E9_legacy_turret', 'legacy_turret', 4, (48, 48), (40, 36)),
        ('E10_deprecated_bot', 'deprecated_bot', 4, (48, 48), (36, 36)),
    ]
    projectiles = {'heap_crab': ('memory_block', (8, 8)),
                   'clock_spike': ('clock_spike_shot', (12, 12)),
                   'legacy_turret': ('punched_card', (12, 8))}
    for source, name, count, size, fit in enemies:
        main_count = count - (name in projectiles)
        out.append(spec('enemies', 'enemy_' + name, 'enemies/' + source, count, 1,
                        cells(0, range(main_count)), size, fit,
                        anchor='top' if name == 'dangling_ref' else
                        'center' if name in ('spam_drone', 'void_eye') else 'bottom'))
        if name in projectiles:
            key, frame = projectiles[name]
            out.append(spec('enemies', key, 'enemies/' + source, count, 1,
                            cells(0, [count - 1]), frame))

    for name, source, size, fit in [
        ('memory_leak', 'BS1b_memory_leak_anim', (96, 80), (88, 64)),
        ('race_condition', 'BS2b_race_condition_anim', (96, 80), (88, 60)),
        ('null_pointer', 'BS3b_null_pointer_anim', (80, 80), (64, 64)),
    ]:
        out.append(spec('bosses', 'boss_' + name, 'bosses/' + source, 8, 1,
                        cells(0, range(8)), size, fit,
                        anchor='center' if name == 'null_pointer' else 'bottom'))
    for source, count, items in [
        ('BS1c_memory_leak_extras', 5, [('portrait_memory_leak', [0], (48, 48)),
            ('memory_goo', [1, 2], (16, 16)), ('memory_puddle', [3, 4], (32, 16))]),
        ('BS2c_race_condition_extras', 6, [('portrait_race_condition', [0], (48, 48)),
            ('clock_blade', [1, 2, 3, 4], (24, 24)), ('race_afterimage', [5], (96, 80))]),
        ('BS3c_null_pointer_extras', 5, [('portrait_null_pointer', [0], (48, 48)),
            ('null_cursor', [1, 2], (16, 16)), ('null_missing_tile', [3, 4], (16, 16))]),
    ]:
        for key, indices, size in items:
            out.append(spec('bosses', key, 'bosses/' + source, count, 1, cells(0, indices), size))
    for key, rectangle, size in [
        ('boss_tech_debt', (0, 0, .66, 1), (256, 192)),
        ('tech_debt_core_portrait', (.66, 0, 1, 1), (48, 48)),
    ]:
        out.append(spec('bosses', key, 'bosses/BS4a_tech_debt_sheet', 1, 1, [(0, 0)],
                        size, (240, 160) if key == 'boss_tech_debt' else size, rects=[rectangle]))
    for key, indices, size in [
        ('tech_crt', [0, 1, 7], (64, 48)), ('tech_drawer', [2, 3], (48, 32)),
        ('tech_reels', [4, 5], (48, 32)), ('tech_card', [6], (12, 8)),
    ]:
        out.append(spec('bosses', key, 'bosses/BS4b_tech_debt_parts', 8, 1, cells(0, indices), size))
    out.append(spec('bosses', 'boss_tech_core', 'bosses/BS4c_tech_debt_core', 7, 1,
                    cells(0, range(6)), (64, 64), (56, 48)))
    out.append(spec('bosses', 'tech_laser', 'bosses/BS4c_tech_debt_core', 7, 1,
                    cells(0, [6]), (32, 8), stretch=True))

    out.append(spec('icons', 'bob_life', 'bob/B11_icons', 2, 1, [(0, 0)], (16, 16)))
    out.append(spec('icons', 'bob_portrait', 'bob/B11_icons', 2, 1, [(0, 1)], (32, 32)))
    out.append(spec('icons', 'update_terminal', 'bob_armor/A3_update_terminal', 6, 1,
                    cells(0, range(6)), (40, 64), (32, 56), anchor='bottom'))
    for i, part in enumerate(['head', 'arm', 'body', 'legs']):
        out.append(spec('icons', 'armor_' + part, 'bob_armor/A4_part_icons', 4, 2,
                        [(0, i), (1, i)], (16, 16)))

    for stage in ['T1_memory_leak', 'T2_race_condition', 'T3_null_pointer', 'T4_tech_debt']:
        empty = [22, 23] if stage.startswith(('T2', 'T3')) else [20, 21, 22, 23]
        out.append(spec('tiles', 'tiles_' + stage[3:], 'tiles/' + stage + '_tiles', 6, 4,
                        [(r, c) for r in range(4) for c in range(6)], (16, 16), empty=empty,
                        frame_fit={i: 'width' if 12 <= i <= 14 else 'fill' for i in range(18)},
                        top_frames=[12, 13, 14]))
    for key, indices, size in [('boss_door', [0, 1, 2], (32, 48)),
                               ('checkpoint', [3, 4], (16, 32)),
                               ('moving_platform', [5], (48, 16))]:
        out.append(spec('tiles', key, 'tiles/T5_common', 6, 1, cells(0, indices), size,
                        mode='runs', stretch=True, anchor='bottom'))
    # Existing ASCII test-map indices: solid, background, hazard, one-way platform.
    out.append(spec('tiles', 'tiles_test', 'tiles/T1_memory_leak_tiles', 6, 4,
                    [(0, 0), (2, 5), (2, 4), (2, 1)], (16, 16),
                    frame_fit={0: 'fill', 1: 'fill', 2: 'fill', 3: 'width'}, top_frames=[3]))

    out.append(spec('ui', 'title_logo', 'ui/U1_logo_readable', 1, 1, [(0, 0)], (224, 48)))
    out.append(spec('ui', 'title_logo_night', 'ui/U1_logo_readable', 1, 1, [(0, 0)], (224, 48), (220, 44)))
    out.append(spec('ui', 'title_background', 'ui/U2_title_bg', 1, 1, [(0, 0)],
                    (256, 224), opaque=True, stretch=True))
    out.append(spec('ui', 'title_background_wide', 'ui/U2_title_cyberpunk', 1, 1, [(0, 0)],
                    (480, 270), opaque=True, stretch=True))
    out.append(spec('ui', 'ending_background', 'ui/U5_ending_bg', 1, 1, [(0, 0)],
                    (480, 270), opaque=True, stretch=True))
    for key, rectangle, size in [('stage_select', (0, 0, .785, 1), (256, 224)),
                                  ('stage_locked', (.785, 0, 1, 1), (48, 48))]:
        out.append(spec('ui', key, 'ui/U3_stage_select', 1, 1, [(0, 0)], size, rects=[rectangle]))
    for i, (key, size) in enumerate([
        ('hud_health_frame', (8, 64)), ('hud_health_segment', (4, 2)),
        ('hud_weapon_segment', (4, 2)), ('icon_buster', (16, 16)),
        ('icon_gc', (16, 16)), ('icon_mutex', (16, 16)),
        ('icon_null', (16, 16)), ('pause_panel', (128, 96)),
    ]):
        out.append(spec('ui', key, 'ui/U4_hud', 8, 1, [(0, i)], size, mode='runs', stretch=i < 3))
    return out


EXISTING_FX = {item[0] for _, _, _, animations in FX_SHEETS for item in animations} | {'fx_hit'}
REFERENCE_ONLY = ['bob/B1_bob_sheet.png', 'bob_armor/A1_armor_sheet.png',
                  'ui/U1_logo-original.png', 'ui/U1_logo.png', 'ui/U2_title_bg_wide.png',
                  'bosses/BS1a_memory_leak_sheet.png', 'bosses/BS2a_race_condition_sheet.png',
                  'bosses/BS3a_null_pointer_sheet.png']
