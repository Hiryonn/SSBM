SPEC = dict(
    name='Mr. Incredible', sheet='mr-incredible.PNG', credit='SSF', sounds='Mr. Incredible', height=64,
    anims=dict(
        idle=['1.0'], walk='2.0-2.2', run='3.0-3.3', crouch=['12.3'], jumpSquat=['12.3'],
        jump=['9.1'], doubleJump=['9.2', '9.3'], fall=['9.4'], land=['12.3'],
        shield=['12.1'], dodge=['9.0'], roll=['18.0', '18.1', '18.2'], hurt=['4.0'], hurtAir=['4.0'], tumble=['18.0', '18.1'],
        lie=['9.0'], getup=['12.3'], taunt=['12.0', '12.2'], win=['16.0'],
        jab=['5.0', '5.1'], ftilt=['11.0', '11.1'], utilt=['4.2', '4.3'], dtilt=['7.3'], dash=['3.2', '5.7'],
        fsmash=['16.0', '16.1'], usmash=['12.0', '12.4'], dsmash=['7.0', '7.2'],
        nair='18.0-18.2', fair=['16.3'], uair=['12.4'], dair=['5.9'],
        neutralB=['5.6', '5.7'], sideB='18.0-18.3', upB=['9.2', '9.3'], downB=['15.3', '15.5', '15.6'],
        grab=['4.4', '4.5'],
    ),
    times=dict(walk=8, run=5, fsmash=[14, 12], sideB=4, downB=[8, 6, 14]),
    moves=dict(upB=dict(vy=-8.5, helpless=True), sideB=dict(vx=7, hit=dict(dmg=12)), fsmash=dict(hit=dict(dmg=20)),
               downB=dict(hit=dict(dmg=15, angle=80))),
    stats=dict(weight=118, walkSpeed=1.2, runSpeed=2.7, jumpForce=8.0, doubleJumpForce=7.0),
)
