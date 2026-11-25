SPEC = dict(
    name='Captain Falcon', sheet='captfalcon.gif', credit='SSF', region=(0, 0, 575, 560), sounds='Captain Falcon',
    anims=dict(
        idle='10.3-10.7', walk=['2.0', '4.0'], run=['2.2', '2.3', '2.4', '2.5'], crouch=['4.0'], jumpSquat=['4.0'],
        jump=['0.2'], doubleJump=['4.3', '8.3'], fall=['4.4'], land=['4.0'],
        shield=['2.0'], dodge=['4.3'], roll=['4.3', '8.3'], hurt=['4.3'], hurtAir=['4.4'], tumble=['4.4', '6.5'],
        lie=['6.4'], getup=['4.0'], taunt=['10.4', '10.5'], win=['6.2'],
        jab=['10.0', '10.1'], ftilt=['8.1'], utilt=['8.2'], dtilt=['8.0'], dash=['2.5', '4.1'],
        fsmash=['10.6', '2.1'], usmash=['4.0', '6.2'], dsmash=['8.0', '6.4'],
        nair=['4.1'], fair=['8.1'], uair=['8.2'], dair=['8.3'],
        neutralB=['10.6', '10.7', '2.1'], sideB=['6.0', '6.1'], upB=['4.2', '6.2'], downB=['8.0'],
        grab=['10.0', '10.1'],
    ),
    times=dict(idle=10, neutralB=[14, 14, 16], sideB=[8, 16], upB=[6, 14], downB=[18]),
    moves=dict(neutralB=dict(hit=dict(dmg=25, bkb=40, kbg=1.1)), upB=dict(vy=-8, helpless=True), sideB=dict(vx=6),
               downB=dict(vx=7, hit=dict(dmg=15))),
    stats=dict(weight=104, walkSpeed=1.4, runSpeed=3.4, jumpForce=8.6, doubleJumpForce=7.8),
)
