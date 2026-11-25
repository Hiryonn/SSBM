SPEC = dict(
    name='Blue', sheet='blue.png', credit='Blade', sounds='Blue', height=54,
    anims=dict(
        idle='0.0-0.4', walk='1.3-1.8', run='1.3-1.8', crouch=['3.1'], jumpSquat=['3.1'],
        jump=['1.0'], doubleJump=['5.0', '5.1', '7.0', '7.1'], fall=['1.1'], land=['3.1'],
        shield=['5.2'], dodge=['5.3'], roll=['5.0', '5.1'], hurt=['5.3'], hurtAir=['5.2'], tumble=['5.0', '5.1'],
        lie=['4.0'], getup=['3.1'], taunt=['2.7'], win=['2.7'],
        jab=['2.0', '2.1'], ftilt=['2.2', '2.3'], utilt=['1.2'], dtilt=['3.0', '3.1'], dash=['4.1', '4.2'],
        fsmash=['3.3', '3.4', '3.5'], usmash=['1.1', '1.2'], dsmash=['2.5', '2.6'],
        nair=['7.0', '7.1'], fair=['2.4'], uair=['1.2'], dair=['5.1'],
        neutralB=['3.4', '3.5', '3.6'], sideB=['4.1', '4.2'], upB=['7.0', '7.1', '5.0'], downB=['2.6', '2.7'],
        grab=['2.0', '2.1'],
    ),
    times=dict(idle=10, walk=7, run=4, doubleJump=3, upB=4),
    moves=dict(upB=dict(vy=-9.5, helpless=True, hit=dict(dmg=10)), sideB=dict(vx=8, hit=dict(dmg=10)), neutralB=dict(hit=dict(dmg=13))),
    stats=dict(weight=88, walkSpeed=1.5, runSpeed=3.8, jumpForce=8.8, doubleJumpForce=8.0),
)
