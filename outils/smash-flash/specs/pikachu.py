SPEC = dict(
    name='Pikachu', sheet='semipika.gif', credit='SemiJuggalo', region=(0, 25, 240, 670), sounds='Pikachu', height=42,
    anims=dict(
        idle='0.0-0.3', walk='2.0-2.3', run='4.0-4.3', crouch=['0.4'], jumpSquat=['0.4'],
        jump=['10.0'], doubleJump=['10.3', '10.2'], fall=['10.0'], land=['0.4'],
        shield=['7.0'], dodge=['13.1'], roll=['10.2', '10.3'], hurt=['11.1'], hurtAir=['11.1'], tumble=['10.2', '10.3'],
        lie=['11.2'], getup=['0.4'], taunt='15.0-15.3', win='15.0-15.3',
        jab=['7.0', '7.1'], ftilt=['9.1'], utilt=['7.2'], dtilt=['0.4', '9.1'], dash=['4.3', '9.1'],
        fsmash=['7.0', '13.2', '13.0'], usmash=['7.2', '13.1'], dsmash=['10.2', '10.3'],
        nair=['10.2', '10.3'], fair=['9.1'], uair=['7.2'], dair=['10.3'],
        neutralB=['6.1'], sideB=['9.0', '9.2'], upB=['10.3', '10.2'], downB='13.0-13.2',
        grab=['2.3', '7.1'],
    ),
    times=dict(idle=10, taunt=8, win=10, sideB=[8, 16], downB=[8, 8, 18], neutralB=[16]),
    moves=dict(upB=dict(vy=-8.5, helpless=True), sideB=dict(vx=6, hit=dict(dmg=14)), downB=dict(hit=dict(dmg=16))),
    stats=dict(weight=79, walkSpeed=1.3, runSpeed=2.9, jumpForce=8.8, doubleJumpForce=8.0),
)
