SPEC = dict(
    name='Kirby', sheet='kirbysskirby.png', credit='SSF', region=(80, 20, 541, 480), gap=0, sounds='Kirby', height=36,
    anims=dict(
        idle=['0.0', '0.0', '0.1'], walk='2.0-2.7', run='2.0-2.7', crouch=['0.3'], jumpSquat=['0.3'],
        jump=['0.5'], doubleJump='3.5-3.9', fall=['0.6'], land=['0.3'],
        shield=['4.0'], dodge=['0.2'], roll='1.3-1.6', hurt=['3.1'], hurtAir=['3.2'], tumble='1.3-1.6',
        lie=['0.3'], getup=['0.4'], taunt='11.0-11.5', win='12.8-12.10',
        jab=['12.1', '12.2'], ftilt=['12.3', '12.4'], utilt=['11.2', '11.3'], dtilt=['0.3', '12.4'], dash=['1.3', '1.4'],
        fsmash=['12.5', '12.6', '12.7'], usmash=['11.1', '11.2', '11.3'], dsmash=['1.5', '1.6'],
        nair=['11.4'], fair=['1.3', '1.4'], uair=['11.2', '11.3'], dair=['1.5', '1.6'],
        neutralB=['6.0', '6.1', '3.10'], sideB=['12.5', '12.6', '12.7'], upB=['11.0', '11.1', '11.2'], downB=['0.4'],
        grab=['6.1', '6.2'], proj=['3.11'],
    ),
    times=dict(idle=[40, 20, 8], doubleJump=6, taunt=6, win=10, neutralB=[8, 12, 10], downB=[30]),
    proj_move=dict(move='neutralB', at=2, vx=5, vy=0, gravity=0.0, life=50, dmg=9, no_melee=True),
    moves=dict(upB=dict(vy=-7.5, helpless=True), downB=dict(vy=6, hit=dict(dmg=14, angle=60))),
    stats=dict(weight=79, walkSpeed=1.1, runSpeed=2.2, jumpForce=7.6, doubleJumpForce=6.8, jumps=6),
)
