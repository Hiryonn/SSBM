SPEC = dict(
    name='Inuyasha', sheet='inuyasharip.png', credit='SSF', sounds='Inuyasha', height=58,
    anims=dict(
        idle='3.0-3.3', walk='3.4-3.9', run=['3.10', '3.11'], crouch=['2.5'], jumpSquat=['2.5'],
        jump=['2.4'], doubleJump=['2.4', '5.0'], fall=['2.4'], land=['2.5'],
        shield=['4.2'], dodge=['2.5'], roll=['2.4', '2.5'], hurt=['4.0'], hurtAir=['4.1'], tumble=['4.0', '4.1'],
        lie=['2.5'], getup=['2.5'], taunt=['0.1', '0.2'], win=['0.2'],
        jab=['5.2', '5.3'], ftilt=['4.3', '4.4'], utilt=['4.7'], dtilt=['5.4', '5.3'], dash=['3.11', '5.2'],
        fsmash=['4.5', '4.6'], usmash=['4.7', '5.1'], dsmash=['5.4', '4.6'],
        nair=['5.1'], fair=['5.0', '5.1'], uair=['4.7'], dair=['5.0'],
        neutralB=['5.5', '5.6', '6.0'], sideB=['6.1', '6.4'], upB=['2.4', '4.7'], downB=['6.2'],
        grab=['5.2', '5.3'],
    ),
    times=dict(idle=12, walk=7, run=5, neutralB=[10, 8, 14], sideB=[10, 14]),
    moves=dict(upB=dict(vy=-9, helpless=True), neutralB=dict(hit=dict(dmg=18, bkb=35)), sideB=dict(vx=4, hit=dict(dmg=13))),
    stats=dict(weight=98, walkSpeed=1.4, runSpeed=3.1, jumpForce=8.6, doubleJumpForce=7.8),
)
