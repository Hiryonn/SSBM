SPEC = dict(
    name='Sheik', sheet='sheik.gif', credit='SSF', sounds='Sheik', height=58,
    anims=dict(
        idle=['0.0'], walk=['0.1', '0.2'], run='1.0-1.3', crouch=['4.2'], jumpSquat=['4.2'],
        jump=['0.4'], doubleJump=['0.6', '0.4'], fall=['0.4'], land=['4.2'],
        shield=['0.0'], dodge=['6.0'], roll=['1.4', '0.4'], hurt=['4.0'], hurtAir=['4.1'], tumble=['4.0', '4.1'],
        lie=['4.3'], getup=['4.2'], taunt=['1.4'], win=['0.0'],
        jab=['5.0', '5.1'], ftilt=['5.2'], utilt=['0.6'], dtilt=['4.2', '5.1'], dash=['1.3', '5.3'],
        fsmash=['3.0', '3.1', '3.2'], usmash=['5.3', '0.6'], dsmash=['3.3', '3.4'],
        nair=['5.3'], fair=['0.6'], uair=['5.3'], dair=['0.3'],
        neutralB=['4.5', '4.6'], sideB=['3.0', '3.2', '3.4'], upB=['6.0'], downB=['0.3'],
        grab=['3.0', '3.1'],
    ),
    times=dict(walk=8, run=5, upB=[20], fsmash=[10, 6, 12], neutralB=[16, 10]),
    moves=dict(upB=dict(vy=-10, helpless=True, hit=dict(dmg=12)), neutralB=dict(hit=dict(dmg=9)), sideB=dict(hit=dict(dmg=12))),
    stats=dict(weight=90, walkSpeed=1.5, runSpeed=3.4, jumpForce=9.0, doubleJumpForce=8.0),
)
