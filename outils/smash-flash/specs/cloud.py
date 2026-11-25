SPEC = dict(
    name='Cloud', sheet='cloud.gif', face='left', credit='SSF', sounds='Cloud', height=62,
    anims=dict(
        idle=['0.0'], walk=['0.1', '0.2'], run=['1.0', '1.2'], crouch=['0.3'], jumpSquat=['0.3'],
        jump=['1.3'], doubleJump=['1.1', '1.3'], fall=['1.3'], land=['0.3'],
        shield=['8.3'], dodge=['4.0'], roll=['1.0', '0.3'], hurt=['7.9'], hurtAir=['7.9'], tumble=['7.9', '4.1'],
        lie=['7.10'], getup=['0.3'], taunt=['7.11'], win=['8.3'],
        jab=['7.0', '7.1'], ftilt=['2.0', '2.1'], utilt=['7.8'], dtilt=['7.3'], dash=['1.2', '2.2'],
        fsmash=['3.0', '3.1', '3.2'], usmash=['8.1', '7.8'], dsmash=['2.2', '2.3'],
        nair=['6.0', '6.1'], fair=['3.1', '3.3'], uair=['8.1'], dair=['8.4'],
        neutralB=['6.2', '6.1'], sideB=['8.0', '8.2'], upB=['7.8', '8.1'], downB='9.0-9.2',
        grab=['7.0', '7.5'],
    ),
    times=dict(fsmash=[12, 5, 14], downB=[20, 6, 10], neutralB=[8, 14]),
    moves=dict(upB=dict(vy=-9, helpless=True), fsmash=dict(hit=dict(dmg=19)), downB=dict(hit=dict(dmg=20, bkb=40))),
    stats=dict(weight=100, walkSpeed=1.3, runSpeed=2.9, jumpForce=8.2, doubleJumpForce=7.4),
)
