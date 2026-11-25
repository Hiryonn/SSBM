SPEC = dict(
    name='Fox', sheet='fox7wt.gif', credit='SSF', region=(0, 0, 840, 380), sounds='Fox', height=56,
    anims=dict(
        idle=['0.0'], walk='7.0-7.5', run='7.0-7.5', crouch=['1.7'], jumpSquat=['1.7'],
        jump=['1.0'], doubleJump=['1.7', '1.0'], fall=['1.0'], land=['1.7'],
        shield='3.2-3.4', dodge=['2.4'], roll=['1.1', '1.2'], hurt=['1.3'], hurtAir=['1.4'], tumble=['1.4', '1.5'],
        lie=['1.3'], getup=['1.7'], taunt=['0.1'], win=['0.11'],
        jab=['0.7', '0.8'], ftilt=['0.9', '0.10'], utilt=['1.8', '1.9'], dtilt=['1.5', '1.6'], dash=['2.5'],
        fsmash=['0.7', '0.12', '0.10'], usmash=['1.10', '1.11', '1.9'], dsmash=['1.5', '1.6'],
        nair=['2.5'], fair=['0.12'], uair=['1.11'], dair=['1.6'],
        neutralB=['0.2', '0.3', '0.5'], sideB=['2.4', '2.5'], upB=['2.0', '2.1', '2.2'], downB='3.2-3.7',
        grab=['0.7', '0.8'], proj=['0.6'],
    ),
    times=dict(idle=12, run=4, neutralB=[4, 4, 10], sideB=[6, 14], upB=[14, 6, 12], downB=3),
    proj_move=dict(move='neutralB', at=2, vx=9, vy=0, gravity=0.0, life=45, dmg=3, no_melee=True),
    moves=dict(upB=dict(vy=-9, helpless=True), sideB=dict(vx=9, hit=dict(dmg=7)), downB=dict(hit=dict(dmg=5, angle=80))),
    stats=dict(weight=75, walkSpeed=1.6, runSpeed=3.6, jumpForce=9.0, doubleJumpForce=8.2, fallSpeed=3.4),
)
