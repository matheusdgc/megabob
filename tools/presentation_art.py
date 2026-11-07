"""Presentation art and integration layouts; scene flow remains in Phaser."""
from PIL import Image, ImageDraw

from ui_art import SIZE, INK, frame_panel, ui_text

BOSSES = [
    ('memory-leak', 'MEMORY LEAK', 'portrait_memory_leak', (8, 189, 186, 255)),
    ('race-condition', 'RACE CONDITION', 'portrait_race_condition', (241, 194, 27, 255)),
    ('null-pointer', 'NULL POINTER', 'portrait_null_pointer', (165, 110, 255, 255)),
    ('tech-debt', 'TECH DEBT', 'tech_debt_core_portrait', (66, 190, 101, 255)),
]
WEAPONS = [
    ('gc', 'GARBAGE COLLECTOR', ['Absorve o lodo e atravessa', 'inimigos.'], (8, 189, 186, 255)),
    ('mutex', 'MUTEX LOCK', ['Congela por um instante', 'os inimigos da tela.'], (241, 194, 27, 255)),
    ('null', 'NULL POINTER', ['Dispare setas que atravessam', 'paredes finas.'], (165, 110, 255, 255)),
]
UPGRADES = [
    ('head', 1, 'DEBUG VISOR', ['Revela passagens escondidas', 'e a vida dos chefes.']),
    ('arm', 2, 'COMPILER CANNON', ['Libera carga de nível 3', 'e armas especiais carregadas.']),
    ('body', 4, 'FIREWALL PLATING', ['Reduz dano pela metade', 'e diminui o recuo.']),
    ('legs', 8, 'TURBO BOOTS', ['Libera um dash no ar', 'a cada pulo.']),
]


def presentation_assets(panel):
    return {
        'boss_intro_panel': frame_panel(panel, (416, 112), 8, opaque=False),
        'reward_panel': frame_panel(panel, (416, 192), 8, opaque=False),
    }


def layout():
    """Positions are local to a centered container in the reference viewport."""
    return dict(
        viewport=SIZE, filtering='nearest', scaling='integer-fit-letterbox',
        containerAnchor=[0.5, 0.5], origin=[0, 0], textBakedIntoAssets=False,
        boss=dict(texture='boss_intro_panel', size=[416, 112], offset=[-208, -56],
                  portrait=dict(position=[16, 8], size=[96, 96], integerScale=2),
                  heading=dict(position=[136, 22], fontSize=10),
                  name=dict(position=[136, 48], fontSize=20, maxWidth=264),
                  caption=dict(position=[136, 82], fontSize=10)),
        reward=dict(texture='reward_panel', size=[416, 192], offset=[-208, -96],
                    bob=dict(position=[16, 50], size=[96, 96], frame=1, integerScale=2),
                    heading=dict(position=[136, 20], fontSize=12),
                    name=dict(position=[136, 48], fontSize=17, maxWidth=264),
                    description=dict(position=[136, 116], fontSize=11, lineHeight=16, maxWidth=264),
                    icon=dict(position=[136, 78], size=[32, 32], integerScale=2),
                    footer=dict(position=[208, 172], fontSize=10, align='center'),
                    prompt='Resolve the current confirm binding in the scene; do not bake a key.'),
    )


def previews(assets, load):
    """Read existing frames without tinting faces or changing sprite proportions."""
    result = {}
    config = layout()
    for slug, name, portrait, accent in BOSSES:
        image = Image.new('RGBA', SIZE, INK)
        image.alpha_composite(assets['boss_intro_panel'], (32, 79))
        image.alpha_composite(load('bosses/' + portrait).resize((96, 96), Image.Resampling.NEAREST), (48, 87))
        ui_text(image, (168, 101), 'CHEFE DETECTADO', 10, accent)
        ui_text(image, (168, 127), name, 20)
        ui_text(image, (168, 161), 'PREPARE-SE', 10, accent)
        result['boss-' + slug] = image
    for kind, rows in [('weapon', WEAPONS), ('upgrade', UPGRADES)]:
        for row in rows:
            if kind == 'weapon':
                slug, name, description, accent = row
                bob_key, icon_key = 'bob/bob_victory', 'ui/icon_' + slug
                heading, footer = 'ARMA RECEBIDA', 'TROCAR ARMA: Q / E'
            else:
                slug, mask, name, description = row
                accent = (69, 137, 255, 255)
                bob_key, icon_key = 'bob/bob_victory_a' + str(mask), 'icons/armor_' + slug
                heading, footer = 'UPGRADE INSTALADO', 'FIRMWARE ATUALIZADO'
            image = Image.new('RGBA', SIZE, INK)
            image.alpha_composite(assets['reward_panel'], (32, 39))
            bob = load(bob_key).crop((48, 0, 96, 48)).resize((96, 96), Image.Resampling.NEAREST)
            image.alpha_composite(bob, (48, 89))
            icon = load(icon_key).crop((0, 0, 16, 16)).resize((32, 32), Image.Resampling.NEAREST)
            image.alpha_composite(icon, (168, 117))
            ui_text(image, (168, 59), heading, 12, accent)
            ui_text(image, (168, 87), name, 17)
            for i, line in enumerate(description):
                ui_text(image, (168, 155 + i * 16), line, 11)
            ui_text(image, (240, 211), footer, 10, accent, anchor='mt')
            result[kind + '-' + slug] = image
    # Preview labels above remain samples; binding-dependent runtime text is separate.
    config['previewWeaponBindings'] = 'Q / E (default only)'
    return result, config


def gallery(images):
    result = Image.new('RGBA', (960, 580), INK)
    for i, (key, label) in enumerate([
        ('boss-memory-leak', 'ENTRADA DO CHEFE'), ('boss-tech-debt', 'FORTALEZA'),
        ('weapon-gc', 'ARMA RECEBIDA'), ('upgrade-legs', 'UPGRADE INSTALADO'),
    ]):
        x, y = i % 2 * 480, i // 2 * 290
        ui_text(result, (x + 8, y + 5), label, 10)
        result.alpha_composite(images[key], (x, y + 20))
    return result


def end_screen_layout():
    return dict(
        viewport=SIZE, filtering='nearest', scaling='integer-fit-letterbox',
        containerAnchor=[0.5, 0.5], offset=[-240, -135], textBakedIntoAssets=False,
        ending=dict(background='ending_background', logo=dict(texture='title_logo_night', position=[240, 16], size=[224, 48]),
                    heading=dict(position=[248, 78], fontSize=13),
                    thanks=dict(position=[248, 100], fontSize=12),
                    creditClipRect=[248, 132, 216, 90],
                    creditText='Use verified runtime credits; no sample names are provided.'),
        gameOver=dict(panel=dict(texture='reward_panel', position=[32, 39]),
                      bob=dict(texture='bob_hurt', frame=0, position=[54, 90], integerScale=2),
                      heading=dict(position=[168, 74], fontSize=24),
                      description=dict(position=[168, 116], fontSize=10, lineHeight=18),
                      action=dict(center=[240, 204], rect=[118, 188, 244, 32], fontSize=12,
                                  label='VOLTAR À SELEÇÃO', initialFocus=True),
                      controls='Scene resolves confirm binding; art does not handle input.'),
    )


def end_screen_previews(load):
    config = end_screen_layout()
    ending = load('ui/ending_background')
    ending.alpha_composite(load('ui/title_logo_night'), (240, 16))
    ui_text(ending, (248, 78), 'SISTEMA RESTAURADO', 13)
    ui_text(ending, (248, 100), 'Obrigado por jogar!', 12)
    # The quiet region below stays empty for actual credits supplied by the scene.
    game_over = Image.new('RGBA', SIZE, INK)
    game_over.alpha_composite(load('ui/reward_panel'), (32, 39))
    bob = load('bob/bob_hurt').crop((0, 0, 48, 48)).resize((96, 96), Image.Resampling.NEAREST)
    game_over.alpha_composite(bob, (54, 90))
    ui_text(game_over, (168, 74), 'GAME OVER', 24, (241, 194, 27, 255))
    ui_text(game_over, (168, 116), 'A compilação foi interrompida.', 10)
    ui_text(game_over, (168, 134), 'Hora de tentar outra vez.', 10)
    ImageDraw.Draw(game_over).rectangle((118, 188, 361, 219), outline=(69, 137, 255, 255), width=2)
    ui_text(game_over, (240, 198), 'VOLTAR À SELEÇÃO', 12, anchor='mt')
    return {'ending': ending, 'game-over': game_over}, config
