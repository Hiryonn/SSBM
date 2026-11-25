SPEC = dict(
    name='Luigi', sheet='xander_luigi_sheet.png', credit='Xander / Rogultgot', region=(0, 0, 219, 860), sounds='Luigi',
    anims=dict(
        idle=['2.0', '0.3'], walk='1.0-1.3', run='3.0-3.3', crouch=['7.0'], jumpSquat=['7.0'],
        jump=['5.2'], doubleJump=['5.0', '5.1'], fall=['5.3'], land=['7.0'],
        shield=['6.3'], dodge=['15.1'], roll=['15.1', '15.2'], hurt=['8.1'], hurtAir=['6.1'], tumble=['5.0', '5.1'],
        lie=['6.0'], getup=['7.0'], taunt=['0.1'], win=['0.1'],
        jab=['7.1', '7.2'], ftilt=['2.2', '2.3'], utilt=['6.2', '14.1'], dtilt=['7.0', '0.0'], dash=['0.0'],
        fsmash=['13.2', '13.1', '13.3'], usmash=['15.0', '14.1', '6.2'], dsmash=['16.0', '16.1'],
        nair=['5.0', '5.1'], fair=['0.0'], uair=['5.2'], dair=['10.1'],
        neutralB=['13.3', '13.0', '13.1'], sideB=['10.0', '10.1', '10.2'], upB=['14.0', '14.1'], downB=['15.1', '16.0', '16.1', '15.2'],
        grab=['7.1'],
    ),
    times=dict(fsmash=[6, 5, 10], upB=[4, 12], downB=4, sideB=[6, 8, 8], neutralB=[6, 8, 10], idle=[16, 12]),
    moves=dict(sideB=dict(vx=5.5, at=0), downB=dict(vy=-1.2)),
    stats=dict(weight=97, walkSpeed=1.2, runSpeed=2.4, jumpForce=9.0, doubleJumpForce=8.3, traction=0.09, airAccel=0.12),
)
