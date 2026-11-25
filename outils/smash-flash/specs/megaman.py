SPEC = dict(
    name='Megaman X', sheet='mmx2-mm.png', credit='Badass Bill / Capcom', sounds='Megaman', height=54,
    anims=dict(
        idle=['2.7', '2.8'], walk='14.8-14.13', run='14.8-14.13', crouch=['2.13'], jumpSquat=['2.13'],
        jump=['2.9', '2.10'], doubleJump=['2.15', '2.16'], fall=['2.11'], land=['2.13'],
        shield=['12.2'], dodge=['13.2'], roll=['3.0', '3.1'], hurt=['14.0'], hurtAir=['14.1'], tumble=['14.1', '14.2'],
        lie=['14.7'], getup=['2.13'], taunt=['13.8'], win=['13.7'],
        jab=['2.0', '2.2'], ftilt=['2.3', '2.4'], utilt=['13.9'], dtilt=['3.6', '3.7'], dash=['3.0', '3.3'],
        fsmash=['2.4', '2.5', '2.6'], usmash=['13.9', '13.10'], dsmash=['3.6', '3.8'],
        nair='9.0-9.2', fair=['3.4', '3.5'], uair=['13.10'], dair=['11.4'],
        neutralB=['1.0', '1.2', '1.6'], sideB=['8.0', '8.1', '8.4'], upB=['9.3', '9.4'], downB=['13.2', '13.3', '13.4'],
        grab=['2.0', '2.1'], proj=['3.11', '3.12', '3.13'],
    ),
    times=dict(idle=40, walk=5, run=4, fsmash=[10, 5, 10], neutralB=[18, 6, 10]),
    proj_move=dict(move='neutralB', at=1, vx=7, vy=0, gravity=0.0, life=55, dmg=12, no_melee=True),
    moves=dict(upB=dict(vy=-9, helpless=True), sideB=dict(hit=dict(dmg=9)), downB=dict(hit=dict(dmg=8))),
    stats=dict(weight=95, walkSpeed=1.4, runSpeed=2.9, jumpForce=8.6, doubleJumpForce=7.6),
)
